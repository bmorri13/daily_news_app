import asyncio
import hmac
import logging
import threading
import time
import uuid
from datetime import datetime, date, timezone, timedelta
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Header, HTTPException, Query, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc, text
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.database import get_db, init_db
from app.models import Article, Source, FetchLog, Newsletter
from app import schemas
from app.rss_fetcher import RSSFetcher
from app.ai_processor import AIProcessor
from app.newsletter_fetcher import NewsletterFetcher
from app.config import get_settings
from app.logging_config import configure_logging, log_event

configure_logging()
logger = logging.getLogger(__name__)

settings = get_settings()

scheduler = AsyncIOScheduler()


# One run of each job at a time, whether started by the scheduler or by hand.
# Each run makes Claude API calls, so overlapping runs only duplicate spend.
_fetch_lock = threading.Lock()
_newsletter_lock = threading.Lock()


def create_fetch_log(db: Session) -> int:
    """Record a new fetch run and return its log ID."""
    fetch_log = FetchLog(status="running")
    db.add(fetch_log)
    db.commit()
    db.refresh(fetch_log)
    return fetch_log.id


async def scheduled_fetch():
    """Run the fetch pipeline on schedule.

    Calls the job directly rather than POSTing to this API, so the trigger
    endpoints don't need to be reachable without a token.
    """
    from app.database import SessionLocal

    try:
        db = SessionLocal()
        try:
            log_id = create_fetch_log(db)
        finally:
            db.close()
        await asyncio.to_thread(run_fetch_job, log_id, "schedule")
    except Exception as e:
        log_event(logger, "job_failed", f"Scheduled fetch failed: {type(e).__name__}",
                  level=logging.ERROR, job="fetch", trigger="schedule",
                  error_type=type(e).__name__, error=str(e)[:500])


async def scheduled_newsletter():
    """Run the newsletter job on schedule."""
    try:
        await asyncio.to_thread(run_newsletter_job, "schedule")
    except Exception as e:
        log_event(logger, "job_failed", f"Scheduled newsletter job failed: {type(e).__name__}",
                  level=logging.ERROR, job="newsletter", trigger="schedule",
                  error_type=type(e).__name__, error=str(e)[:500])


def client_ip(request: Request) -> Optional[str]:
    """The visitor's IP address.

    Requests reach the backend through Cloudflare -> cloudflared -> the Next.js
    frontend, so the socket peer is the frontend container. Cloudflare sets
    CF-Connecting-IP (and overwrites any value a client sends); the backend port
    is bound to loopback, so nothing else can reach it to forge the header.
    """
    ip = request.headers.get("cf-connecting-ip")
    if ip:
        return ip.strip()
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def require_admin_token(request: Request, x_admin_token: Optional[str] = Header(default=None)):
    """Gate the manual trigger endpoints.

    The frontend proxies /api/* from the public site, so these must not be
    open: each call starts Claude API work. With ADMIN_TOKEN unset the
    endpoints don't exist (404); otherwise the X-Admin-Token header must match.
    Every attempt is logged as trigger_invoked or trigger_denied (routed to
    Splunk's security index). The token itself is never logged.
    """
    who = {"path": request.url.path, "client_ip": client_ip(request),
           "user_agent": (request.headers.get("user-agent") or "")[:256] or None}
    expected = settings.admin_token
    if not expected:
        log_event(logger, "trigger_denied", "Trigger called while disabled",
                  level=logging.WARNING, reason="disabled", **who)
        raise HTTPException(status_code=404, detail="Not Found")
    if not x_admin_token or not hmac.compare_digest(
        x_admin_token.encode(), expected.encode()
    ):
        log_event(logger, "trigger_denied", "Trigger called with a bad admin token",
                  level=logging.WARNING,
                  reason="invalid_token" if x_admin_token else "missing_token", **who)
        raise HTTPException(status_code=401, detail="Invalid or missing admin token")
    log_event(logger, "trigger_invoked", "Manual trigger accepted", **who)


@asynccontextmanager
async def lifespan(app):
    """Manage startup and shutdown events."""
    # Startup
    init_db()
    scheduler.add_job(scheduled_fetch, CronTrigger(hour=12, minute=0), id="daily_fetch", misfire_grace_time=3600)
    scheduler.add_job(scheduled_newsletter, CronTrigger(hour=12, minute=5), id="daily_newsletter", misfire_grace_time=3600)
    scheduler.start()
    logger.info("Scheduler started: fetch at 12:00 UTC, newsletter at 12:05 UTC")
    yield
    # Shutdown
    scheduler.shutdown()
    logger.info("Scheduler shut down")


app = FastAPI(
    title="News Aggregator API",
    description="AI-powered news aggregation for Cyber Security, AI, Cloud, and Crypto",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://frontend:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log one http_request event per request, with the visitor's real IP.

    Successful health checks (the compose healthcheck, every 30 s) are skipped.
    """
    # Cloudflare's ray ID ties this line to Cloudflare's own logs.
    request_id = request.headers.get("cf-ray") or uuid.uuid4().hex[:16]
    start = time.perf_counter()
    status = 500
    try:
        response = await call_next(request)
        status = response.status_code
        response.headers["X-Request-ID"] = request_id
        return response
    finally:
        path = request.url.path
        if not (path == "/health" and status < 400):
            log_event(
                logger, "http_request", f"{request.method} {path} {status}",
                level=logging.ERROR if status >= 500 else logging.INFO,
                method=request.method, path=path, query=request.url.query or None,
                status=status, duration_ms=round((time.perf_counter() - start) * 1000, 1),
                client_ip=client_ip(request), country=request.headers.get("cf-ipcountry"),
                user_agent=(request.headers.get("user-agent") or "")[:256] or None,
                request_id=request_id,
            )


# Health Check
@app.get("/health", response_model=schemas.HealthCheck)
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint."""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        log_event(logger, "health_check_failed", f"Health check database error: {type(e).__name__}",
                  level=logging.ERROR, error=str(e)[:300])
        db_status = "disconnected"

    return {
        "status": "healthy" if db_status == "connected" else "unhealthy",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc)
    }


# Articles Endpoints
@app.get("/api/articles", response_model=list[schemas.ArticleSummary])
async def get_articles(
    category: Optional[str] = None,
    featured_date: Optional[date] = None,
    processed_only: bool = True,
    limit: int = Query(default=20, le=100),
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get articles with optional filtering."""
    query = db.query(Article)
    
    if category:
        query = query.filter(Article.category == category)
    
    if featured_date:
        query = query.filter(Article.featured_date == featured_date)
    
    if processed_only:
        query = query.filter(Article.processed == True)
    
    articles = query.order_by(
        desc(Article.relevance_score),
        desc(Article.published_at)
    ).offset(offset).limit(limit).all()
    
    # Enrich with source name
    result = []
    for article in articles:
        article_dict = {
            "id": article.id,
            "title": article.title,
            "url": article.url,
            "category": article.category,
            "summary": article.summary,
            "key_points": article.key_points,
            "ai_tags": article.ai_tags,
            "sentiment": article.sentiment,
            "relevance_score": article.relevance_score,
            "published_at": article.published_at,
            "featured_date": article.featured_date,
            "source_name": article.source.name if article.source else None
        }
        result.append(schemas.ArticleSummary(**article_dict))
    
    return result


@app.get("/api/articles/{article_id}", response_model=schemas.Article)
async def get_article(article_id: int, db: Session = Depends(get_db)):
    """Get a single article by ID."""
    article = db.query(Article).filter(Article.id == article_id).first()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    
    return article


# Daily Digest Endpoint
@app.get("/api/digest", response_model=schemas.DailyDigest)
async def get_daily_digest(
    target_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get the daily digest for a specific date (defaults to today)."""
    if target_date is None:
        target_date = date.today()
    
    processor = AIProcessor(db)
    digest = processor.get_daily_digest(target_date)
    
    # Convert to response format
    categories = {}
    for category, articles in digest["categories"].items():
        categories[category] = [
            schemas.ArticleSummary(
                id=a.id,
                title=a.title,
                url=a.url,
                category=a.category,
                summary=a.summary,
                key_points=a.key_points,
                ai_tags=a.ai_tags,
                sentiment=a.sentiment,
                relevance_score=a.relevance_score,
                published_at=a.published_at,
                featured_date=a.featured_date,
                source_name=a.source.name if a.source else None
            )
            for a in articles
        ]
    
    return {
        "date": target_date,
        "categories": categories,
        "total_articles": digest["total_articles"]
    }


# Get available dates with content
@app.get("/api/digest/dates")
async def get_available_dates(
    limit: int = Query(default=30, le=90),
    db: Session = Depends(get_db)
):
    """Get dates that have featured articles."""
    dates = db.query(Article.featured_date).filter(
        Article.featured_date != None
    ).distinct().order_by(
        desc(Article.featured_date)
    ).limit(limit).all()
    
    return {"dates": [d[0] for d in dates]}


# Category Endpoint
@app.get("/api/categories/{category}", response_model=schemas.CategoryArticles)
async def get_category_articles(
    category: str,
    featured_date: Optional[date] = None,
    limit: int = Query(default=10, le=50),
    db: Session = Depends(get_db)
):
    """Get articles for a specific category."""
    if category not in settings.categories:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid category. Must be one of: {settings.categories}"
        )
    
    query = db.query(Article).filter(
        and_(
            Article.category == category,
            Article.processed == True
        )
    )
    
    if featured_date:
        query = query.filter(Article.featured_date == featured_date)
    
    articles = query.order_by(
        desc(Article.relevance_score),
        desc(Article.published_at)
    ).limit(limit).all()
    
    return {
        "category": category,
        "articles": [
            schemas.ArticleSummary(
                id=a.id,
                title=a.title,
                url=a.url,
                category=a.category,
                summary=a.summary,
                key_points=a.key_points,
                ai_tags=a.ai_tags,
                sentiment=a.sentiment,
                relevance_score=a.relevance_score,
                published_at=a.published_at,
                featured_date=a.featured_date,
                source_name=a.source.name if a.source else None
            )
            for a in articles
        ],
        "total": len(articles)
    }


# Sources Endpoints
@app.get("/api/sources", response_model=list[schemas.Source])
async def get_sources(
    category: Optional[str] = None,
    active_only: bool = True,
    db: Session = Depends(get_db)
):
    """Get all RSS sources."""
    query = db.query(Source)
    
    if category:
        query = query.filter(Source.category == category)
    
    if active_only:
        query = query.filter(Source.active == True)
    
    return query.all()


# Manual Fetch Trigger
@app.post(
    "/api/fetch/trigger",
    response_model=schemas.FetchTriggerResponse,
    dependencies=[Depends(require_admin_token)],
)
async def trigger_fetch(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Manually trigger a fetch operation (requires X-Admin-Token)."""
    if _fetch_lock.locked():
        raise HTTPException(status_code=409, detail="A fetch is already running")

    log_id = create_fetch_log(db)

    # Run fetch in background
    background_tasks.add_task(run_fetch_job, log_id, "manual")

    return {
        "message": "Fetch job started",
        "log_id": log_id,
        "status": "running"
    }


def run_fetch_job(log_id: int, trigger: str = "manual"):
    """Background task to run fetch job."""
    from app.database import SessionLocal

    db = SessionLocal()
    job = {"job": "fetch", "trigger": trigger, "log_id": log_id}

    if not _fetch_lock.acquire(blocking=False):
        try:
            fetch_log = db.query(FetchLog).filter(FetchLog.id == log_id).first()
            if fetch_log:
                fetch_log.status = "failed"
                fetch_log.errors = ["Skipped: another fetch was already running"]
                fetch_log.completed_at = datetime.now(timezone.utc)
                db.commit()
        finally:
            db.close()
        log_event(logger, "job_skipped", "Fetch skipped: another fetch is running",
                  level=logging.WARNING, **job)
        return

    start = time.perf_counter()
    processor = None
    log_event(logger, "job_started", "Fetch job started", **job)
    try:
        fetch_log = db.query(FetchLog).filter(FetchLog.id == log_id).first()

        # Fetch RSS feeds
        fetcher = RSSFetcher(db)
        articles = fetcher.fetch_all_sources(articles_per_source=5)
        fetch_log.articles_fetched = len(articles)

        # Process with AI
        processor = AIProcessor(db)
        processed_count = processor.process_unprocessed_articles(limit=100)
        fetch_log.articles_processed = processed_count

        # Select top articles for today
        processor.select_top_articles_for_today(
            articles_per_category=settings.articles_per_category
        )

        fetch_log.status = "completed"
        fetch_log.completed_at = datetime.now(timezone.utc)
        db.commit()
        log_event(logger, "job_completed", "Fetch job completed",
                  duration_ms=round((time.perf_counter() - start) * 1000),
                  articles_fetched=fetch_log.articles_fetched,
                  articles_processed=processed_count, **processor.stats, **job)

    except Exception as e:
        log_event(logger, "job_failed", f"Fetch job failed: {type(e).__name__}",
                  level=logging.ERROR, duration_ms=round((time.perf_counter() - start) * 1000),
                  error_type=type(e).__name__, error=str(e)[:500],
                  **(processor.stats if processor else {}), **job)
        try:
            db.rollback()
            fetch_log = db.query(FetchLog).filter(FetchLog.id == log_id).first()
            if fetch_log:
                fetch_log.status = "failed"
                # /api/fetch/logs is public: record the error class only; the
                # full message is in the job_failed log event.
                fetch_log.errors = [f"{type(e).__name__} (details in the backend logs)"]
                fetch_log.completed_at = datetime.now(timezone.utc)
                db.commit()
        except Exception as rollback_err:
            log_event(logger, "job_log_update_failed",
                      f"Could not mark fetch log failed: {type(rollback_err).__name__}",
                      level=logging.ERROR, error=str(rollback_err)[:300], **job)

    finally:
        db.close()
        _fetch_lock.release()


# Fetch Logs
@app.get("/api/fetch/logs", response_model=list[schemas.FetchLog])
async def get_fetch_logs(
    limit: int = Query(default=10, le=50),
    db: Session = Depends(get_db)
):
    """Get recent fetch operation logs."""
    logs = db.query(FetchLog).order_by(
        desc(FetchLog.started_at)
    ).limit(limit).all()
    
    return logs


@app.get("/api/fetch/logs/{log_id}", response_model=schemas.FetchLog)
async def get_fetch_log(log_id: int, db: Session = Depends(get_db)):
    """Get a specific fetch log."""
    log = db.query(FetchLog).filter(FetchLog.id == log_id).first()
    
    if not log:
        raise HTTPException(status_code=404, detail="Fetch log not found")
    
    return log


# Stats Endpoint
@app.get("/api/stats")
async def get_stats(db: Session = Depends(get_db)):
    """Get aggregation statistics."""
    total_articles = db.query(func.count(Article.id)).scalar()
    processed_articles = db.query(func.count(Article.id)).filter(
        Article.processed == True
    ).scalar()
    
    articles_by_category = {}
    for category in settings.categories:
        count = db.query(func.count(Article.id)).filter(
            Article.category == category
        ).scalar()
        articles_by_category[category] = count
    
    total_sources = db.query(func.count(Source.id)).scalar()
    active_sources = db.query(func.count(Source.id)).filter(
        Source.active == True
    ).scalar()
    
    # Get last fetch info
    last_fetch = db.query(FetchLog).order_by(
        desc(FetchLog.started_at)
    ).first()
    
    return {
        "total_articles": total_articles,
        "processed_articles": processed_articles,
        "articles_by_category": articles_by_category,
        "total_sources": total_sources,
        "active_sources": active_sources,
        "last_fetch": {
            "status": last_fetch.status if last_fetch else None,
            "started_at": last_fetch.started_at if last_fetch else None,
            "articles_fetched": last_fetch.articles_fetched if last_fetch else 0
        } if last_fetch else None,
        "categories": settings.categories,
        "fetch_interval_hours": settings.fetch_schedule_hours
    }


# Newsletter Endpoints
@app.get("/api/newsletter/latest", response_model=schemas.Newsletter)
async def get_latest_newsletter(db: Session = Depends(get_db)):
    """Get the latest newsletter with executive summary."""
    newsletter = db.query(Newsletter).order_by(
        desc(Newsletter.published_at)
    ).first()

    if not newsletter:
        raise HTTPException(status_code=404, detail="No newsletter found")

    return newsletter


@app.post(
    "/api/newsletter/trigger",
    response_model=schemas.NewsletterTriggerResponse,
    dependencies=[Depends(require_admin_token)],
)
async def trigger_newsletter_fetch(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Manually trigger newsletter fetch and processing (requires X-Admin-Token)."""
    if _newsletter_lock.locked():
        raise HTTPException(status_code=409, detail="A newsletter fetch is already running")

    background_tasks.add_task(run_newsletter_job, "manual")

    return {
        "message": "Newsletter fetch job started",
        "newsletter_id": None,
        "status": "running"
    }


def run_newsletter_job(trigger: str = "manual"):
    """Background task to fetch and process newsletter."""
    from app.database import SessionLocal

    job = {"job": "newsletter", "trigger": trigger}
    if not _newsletter_lock.acquire(blocking=False):
        log_event(logger, "job_skipped", "Newsletter job skipped: another run is in progress",
                  level=logging.WARNING, **job)
        return

    db = SessionLocal()
    start = time.perf_counter()
    processor = None
    log_event(logger, "job_started", "Newsletter job started", **job)

    try:
        # Fetch latest newsletter
        fetcher = NewsletterFetcher(db)
        newsletter = fetcher.fetch_latest()

        summarized = False
        if newsletter and not newsletter.processed:
            # Process with AI
            processor = AIProcessor(db)
            processor.process_newsletter(newsletter)
            summarized = True

        log_event(logger, "job_completed", "Newsletter job completed",
                  duration_ms=round((time.perf_counter() - start) * 1000),
                  newsletter_id=newsletter.id if newsletter else None, summarized=summarized,
                  **(processor.stats if processor else {}), **job)

    except Exception as e:
        log_event(logger, "job_failed", f"Newsletter job failed: {type(e).__name__}",
                  level=logging.ERROR, duration_ms=round((time.perf_counter() - start) * 1000),
                  error_type=type(e).__name__, error=str(e)[:500],
                  **(processor.stats if processor else {}), **job)
        try:
            db.rollback()
        except Exception:
            pass

    finally:
        db.close()
        _newsletter_lock.release()
