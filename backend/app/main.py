from datetime import datetime, date, timezone, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import and_, func, desc, text

from app.database import get_db, init_db
from app.models import Article, Source, FetchLog, Newsletter
from app import schemas
from app.rss_fetcher import RSSFetcher
from app.ai_processor import AIProcessor
from app.newsletter_fetcher import NewsletterFetcher
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="News Aggregator API",
    description="AI-powered news aggregation for Cyber Security, AI, Cloud, and Crypto",
    version="1.0.0"
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


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()
    print("Database initialized.")


# Health Check
@app.get("/health", response_model=schemas.HealthCheck)
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint."""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        print(f"Health check database error: {e}")
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
@app.post("/api/fetch/trigger", response_model=schemas.FetchTriggerResponse)
async def trigger_fetch(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Manually trigger a fetch operation."""
    # Create fetch log
    fetch_log = FetchLog(status="running")
    db.add(fetch_log)
    db.commit()
    db.refresh(fetch_log)
    
    # Run fetch in background
    background_tasks.add_task(run_fetch_job, fetch_log.id)
    
    return {
        "message": "Fetch job started",
        "log_id": fetch_log.id,
        "status": "running"
    }


def run_fetch_job(log_id: int):
    """Background task to run fetch job."""
    from app.database import SessionLocal
    
    db = SessionLocal()
    
    try:
        fetch_log = db.query(FetchLog).filter(FetchLog.id == log_id).first()
        errors = []
        
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
        
    except Exception as e:
        fetch_log.status = "failed"
        fetch_log.errors = [str(e)]
        fetch_log.completed_at = datetime.now(timezone.utc)
    
    finally:
        db.commit()
        db.close()


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


@app.post("/api/newsletter/trigger", response_model=schemas.NewsletterTriggerResponse)
async def trigger_newsletter_fetch(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Manually trigger newsletter fetch and processing."""
    background_tasks.add_task(run_newsletter_job)

    return {
        "message": "Newsletter fetch job started",
        "newsletter_id": None,
        "status": "running"
    }


def run_newsletter_job():
    """Background task to fetch and process newsletter."""
    from app.database import SessionLocal

    db = SessionLocal()

    try:
        # Fetch latest newsletter
        fetcher = NewsletterFetcher(db)
        newsletter = fetcher.fetch_latest()

        if newsletter and not newsletter.processed:
            # Process with AI
            processor = AIProcessor(db)
            processor.process_newsletter(newsletter)
            print(f"Newsletter processed: {newsletter.title[:50]}...")

    except Exception as e:
        print(f"Error in newsletter job: {e}")

    finally:
        db.close()
