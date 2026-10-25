import json
import logging
import re
import time
from datetime import datetime, timezone, date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from anthropic import Anthropic

from app.models import Article, Newsletter
from app.config import get_settings
from app.logging_config import log_event

settings = get_settings()
logger = logging.getLogger(__name__)


class AIProcessor:
    """Processes articles using Claude AI for summarization and tagging."""
    
    def __init__(self, db: Session):
        self.db = db
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-6"
        # Per-instance totals; the job logs them when it finishes.
        self.stats = {"llm_calls": 0, "llm_errors": 0, "input_tokens": 0, "output_tokens": 0}

    def _call_claude(self, operation: str, prompt: str, max_tokens: int, **context):
        """Call the Messages API and log one `llm_call` event (routed to Splunk ai_agents).

        `context` identifies the item (article_id, newsletter_id); the prompt and
        response text are never logged.
        """
        fields = {"provider": "anthropic", "operation": operation, "model": self.model,
                  "max_tokens": max_tokens, **context}
        self.stats["llm_calls"] += 1
        start = time.perf_counter()
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=max_tokens,
                messages=[{"role": "user", "content": prompt}],
            )
        except Exception as e:
            self.stats["llm_errors"] += 1
            log_event(logger, "llm_call", f"Claude {operation} call failed: {type(e).__name__}",
                      level=logging.WARNING, status="error",
                      latency_ms=round((time.perf_counter() - start) * 1000),
                      error_type=type(e).__name__, http_status=getattr(e, "status_code", None),
                      error=str(e)[:500], **fields)
            raise

        usage = getattr(response, "usage", None)
        input_tokens = getattr(usage, "input_tokens", 0) or 0
        output_tokens = getattr(usage, "output_tokens", 0) or 0
        self.stats["input_tokens"] += input_tokens
        self.stats["output_tokens"] += output_tokens
        truncated = response.stop_reason == "max_tokens"
        log_event(logger, "llm_call",
                  f"Claude {operation} call hit max_tokens" if truncated else f"Claude {operation} call",
                  level=logging.WARNING if truncated else logging.INFO, status="ok",
                  latency_ms=round((time.perf_counter() - start) * 1000),
                  input_tokens=input_tokens, output_tokens=output_tokens,
                  stop_reason=response.stop_reason, response_model=response.model,
                  message_id=response.id, **fields)
        return response
    
    def process_article(self, article: Article) -> Article:
        """Process a single article with AI summarization and tagging."""
        if article.processed:
            return article
        
        # Prepare content for processing
        content = article.content or article.title
        
        # Truncate very long content
        if len(content) > 8000:
            content = content[:8000] + "..."
        
        prompt = f"""Analyze this {article.category} news article and provide:
1. A concise 2-3 sentence executive summary (high-level overview)
2. 3-5 distinct key points (specific details, facts, or insights NOT covered in the summary)
3. 3-5 relevant tags (lowercase, single words or short phrases)
4. Sentiment analysis (positive, neutral, or negative)
5. Relevance score from 0.0 to 1.0 (how relevant/important is this article for professionals in {article.category})

Article Title: {article.title}

Article Content:
{content}

Respond in JSON format only, no other text:
{{
    "summary": "2-3 sentence executive overview...",
    "key_points": ["specific detail 1", "specific detail 2", "specific detail 3"],
    "tags": ["tag1", "tag2", "tag3"],
    "sentiment": "positive|neutral|negative",
    "relevance_score": 0.0-1.0
}}"""

        try:
            response = self._call_claude("article_summary", prompt, 500, article_id=article.id)


            # Parse the response
            response_text = response.content[0].text.strip()
            
            # Try to extract JSON from the response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                result = json.loads(json_match.group())

                article.summary = result.get('summary', '')
                article.key_points = result.get('key_points', [])
                article.ai_tags = result.get('tags', [])
                article.sentiment = result.get('sentiment', 'neutral')
                article.relevance_score = float(result.get('relevance_score', 0.5))
            else:
                # Fallback if JSON parsing fails
                log_event(logger, "article_parse_failed", "Claude response had no JSON object",
                          level=logging.WARNING, article_id=article.id)
                article.summary = response_text[:500]
                article.key_points = []
                article.ai_tags = []
                article.sentiment = 'neutral'
                article.relevance_score = 0.5
            
            article.processed = True
            article.processed_at = datetime.now(timezone.utc)
            
        except Exception as e:
            # API errors are already logged as llm_call; this also covers bad JSON.
            log_event(logger, "article_processing_failed", f"Article processing failed: {type(e).__name__}",
                      level=logging.WARNING, article_id=article.id,
                      error_type=type(e).__name__, error=str(e)[:500])
            # Set defaults on error
            article.summary = article.title
            article.key_points = []
            article.ai_tags = []
            article.sentiment = 'neutral'
            article.relevance_score = 0.5
            article.processed = True
            article.processed_at = datetime.now(timezone.utc)
        
        return article
    
    def process_unprocessed_articles(self, limit: int = 50) -> int:
        """Process all unprocessed articles."""
        articles = self.db.query(Article).filter(
            Article.processed == False
        ).limit(limit).all()

        processed_count = 0

        for article in articles:
            self.process_article(article)
            self.db.commit()
            processed_count += 1

        log_event(logger, "articles_processed", f"Processed {processed_count} articles",
                  articles_processed=processed_count)

        return processed_count
    
    def select_top_articles_for_today(
        self,
        articles_per_category: int = 5
    ) -> dict[str, list[Article]]:
        """
        Select the top articles for today based on relevance score.
        Features them by setting featured_date.
        Only considers articles published within the last 24 hours.
        """
        today = date.today()
        cutoff_time = datetime.now(timezone.utc) - timedelta(hours=24)
        selected = {}

        for category in settings.categories:
            # Get processed articles in this category that haven't been featured
            # and were published within the last 24 hours
            articles = self.db.query(Article).filter(
                and_(
                    Article.category == category,
                    Article.processed == True,
                    Article.featured_date == None,
                    Article.published_at >= cutoff_time
                )
            ).order_by(
                Article.relevance_score.desc(),
                Article.published_at.desc()
            ).limit(articles_per_category).all()

            # Mark as featured today
            for article in articles:
                article.featured_date = today

            selected[category] = articles

        self.db.commit()
        log_event(logger, "articles_featured", "Selected today's featured articles",
                  featured={c: len(a) for c, a in selected.items()})

        return selected
    
    def get_daily_digest(self, target_date: Optional[date] = None) -> dict:
        """Get the daily digest for a specific date."""
        if target_date is None:
            target_date = date.today()
        
        digest = {
            "date": target_date,
            "categories": {},
            "total_articles": 0
        }
        
        for category in settings.categories:
            articles = self.db.query(Article).filter(
                and_(
                    Article.category == category,
                    Article.featured_date == target_date
                )
            ).order_by(Article.relevance_score.desc()).all()
            
            digest["categories"][category] = articles
            digest["total_articles"] += len(articles)
        
        return digest

    def process_newsletter(self, newsletter: Newsletter) -> Newsletter:
        """Process a newsletter to generate an executive summary."""
        if newsletter.processed:
            return newsletter

        # Prepare content for processing
        content = newsletter.content or newsletter.title

        # Truncate very long content
        if len(content) > 15000:
            content = content[:15000] + "..."

        prompt = f"""You are analyzing the tl;dr sec cybersecurity newsletter. Create an executive summary that helps security professionals quickly understand the most important topics covered.

Newsletter Title: {newsletter.title}

Newsletter Content:
{content}

Provide an executive summary with the following structure:
1. Key Themes (2-3 major themes covered in this issue)
2. Critical Alerts (any urgent security issues, vulnerabilities, or threats mentioned)
3. Notable Tools & Resources (interesting tools, frameworks, or resources shared)
4. Industry Trends (emerging patterns or shifts in the security landscape)
5. Actionable Takeaways (3-5 specific actions readers should consider)

Format your response as clean, scannable bullet points. Be concise but comprehensive. Focus on information that security professionals would find most valuable."""

        try:
            response = self._call_claude("newsletter_summary", prompt, 1500, newsletter_id=newsletter.id)

            newsletter.executive_summary = response.content[0].text.strip()
            newsletter.processed = True

        except Exception as e:
            log_event(logger, "newsletter_processing_failed", f"Newsletter processing failed: {type(e).__name__}",
                      level=logging.WARNING, newsletter_id=newsletter.id,
                      error_type=type(e).__name__, error=str(e)[:500])
            newsletter.executive_summary = "Executive summary generation failed. Please read the full newsletter below."
            newsletter.processed = True

        self.db.commit()
        return newsletter
