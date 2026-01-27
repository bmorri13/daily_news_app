import json
import re
from datetime import datetime, timezone, date, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, func

from anthropic import Anthropic

from app.models import Article, Newsletter
from app.config import get_settings

settings = get_settings()


class AIProcessor:
    """Processes articles using Claude AI for summarization and tagging."""
    
    def __init__(self, db: Session):
        self.db = db
        self.client = Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-20250514"
    
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
1. A concise 2-3 sentence summary
2. 3-5 relevant tags (lowercase, single words or short phrases)
3. Sentiment analysis (positive, neutral, or negative)
4. Relevance score from 0.0 to 1.0 (how relevant/important is this article for professionals in {article.category})

Article Title: {article.title}

Article Content:
{content}

Respond in JSON format only, no other text:
{{
    "summary": "...",
    "tags": ["tag1", "tag2", "tag3"],
    "sentiment": "positive|neutral|negative",
    "relevance_score": 0.0-1.0
}}"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            # Parse the response
            response_text = response.content[0].text.strip()
            
            # Try to extract JSON from the response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                result = json.loads(json_match.group())
                
                article.summary = result.get('summary', '')
                article.ai_tags = result.get('tags', [])
                article.sentiment = result.get('sentiment', 'neutral')
                article.relevance_score = float(result.get('relevance_score', 0.5))
            else:
                # Fallback if JSON parsing fails
                article.summary = response_text[:500]
                article.ai_tags = []
                article.sentiment = 'neutral'
                article.relevance_score = 0.5
            
            article.processed = True
            article.processed_at = datetime.now(timezone.utc)
            
        except Exception as e:
            print(f"Error processing article {article.id}: {e}")
            # Set defaults on error
            article.summary = article.title
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
            print(f"Processing: {article.title[:50]}...")
            self.process_article(article)
            processed_count += 1
        
        self.db.commit()
        print(f"Processed {processed_count} articles.")
        
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
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1500,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            newsletter.executive_summary = response.content[0].text.strip()
            newsletter.processed = True

        except Exception as e:
            print(f"Error processing newsletter {newsletter.id}: {e}")
            newsletter.executive_summary = "Executive summary generation failed. Please read the full newsletter below."
            newsletter.processed = True

        self.db.commit()
        return newsletter
