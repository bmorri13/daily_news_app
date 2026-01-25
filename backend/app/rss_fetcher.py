import feedparser
import httpx
from datetime import datetime, timezone
from typing import Optional
from dateutil import parser as date_parser
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.models import Source, Article
from app.config import RSS_SOURCES, get_settings

settings = get_settings()


class RSSFetcher:
    """Fetches and parses RSS feeds."""
    
    def __init__(self, db: Session):
        self.db = db
        self.timeout = 30.0
    
    def ensure_sources_exist(self) -> None:
        """Ensure all configured sources exist in the database."""
        for category, sources in RSS_SOURCES.items():
            for source_config in sources:
                existing = self.db.query(Source).filter(
                    Source.feed_url == source_config["feed_url"]
                ).first()
                
                if not existing:
                    source = Source(
                        name=source_config["name"],
                        url=source_config["url"],
                        feed_url=source_config["feed_url"],
                        category=category,
                        active=True
                    )
                    self.db.add(source)
        
        self.db.commit()
        print("Sources synchronized with configuration.")
    
    def fetch_feed(self, feed_url: str) -> Optional[feedparser.FeedParserDict]:
        """Fetch and parse a single RSS feed."""
        try:
            # Use httpx to fetch with timeout, then parse
            with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                response = client.get(feed_url, headers={
                    "User-Agent": "NewsAggregator/1.0 (https://github.com/news-aggregator)"
                })
                response.raise_for_status()
                
            feed = feedparser.parse(response.text)
            
            if feed.bozo and not feed.entries:
                print(f"Warning: Feed {feed_url} has parsing issues: {feed.bozo_exception}")
                return None
            
            return feed
            
        except httpx.HTTPError as e:
            print(f"HTTP error fetching {feed_url}: {e}")
            return None
        except Exception as e:
            print(f"Error fetching {feed_url}: {e}")
            return None
    
    def parse_published_date(self, entry: dict) -> Optional[datetime]:
        """Parse the published date from an RSS entry."""
        date_fields = ['published', 'updated', 'created', 'pubDate']
        
        for field in date_fields:
            if field in entry:
                try:
                    parsed = date_parser.parse(entry[field])
                    # Ensure timezone awareness
                    if parsed.tzinfo is None:
                        parsed = parsed.replace(tzinfo=timezone.utc)
                    return parsed
                except (ValueError, TypeError):
                    continue
        
        # Also check parsed versions
        if hasattr(entry, 'published_parsed') and entry.published_parsed:
            try:
                return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            except (TypeError, ValueError):
                pass
        
        return None
    
    def extract_content(self, entry: dict) -> str:
        """Extract the main content from an RSS entry."""
        # Try different content fields
        if 'content' in entry and entry.content:
            return entry.content[0].get('value', '')
        
        if 'summary' in entry:
            return entry.summary
        
        if 'description' in entry:
            return entry.description
        
        return ''
    
    def fetch_source_articles(self, source: Source, limit: int = 10) -> list[dict]:
        """Fetch articles from a single source."""
        feed = self.fetch_feed(source.feed_url)
        
        if not feed or not feed.entries:
            return []
        
        articles = []
        
        for entry in feed.entries[:limit]:
            # Get the article URL
            url = entry.get('link', '')
            if not url:
                continue
            
            # Check if article already exists
            existing = self.db.query(Article).filter(
                Article.url == url
            ).first()
            
            if existing:
                continue
            
            article_data = {
                'source_id': source.id,
                'title': entry.get('title', 'Untitled'),
                'url': url,
                'author': entry.get('author', entry.get('dc_creator')),
                'content': self.extract_content(entry),
                'published_at': self.parse_published_date(entry),
                'category': source.category
            }
            
            articles.append(article_data)
        
        return articles
    
    def fetch_all_sources(self, articles_per_source: int = 5) -> list[Article]:
        """Fetch articles from all active sources."""
        # Ensure sources exist
        self.ensure_sources_exist()
        
        sources = self.db.query(Source).filter(Source.active == True).all()
        all_articles = []
        
        for source in sources:
            print(f"Fetching from {source.name} ({source.category})...")
            
            article_data_list = self.fetch_source_articles(
                source, 
                limit=articles_per_source
            )
            
            for article_data in article_data_list:
                try:
                    article = Article(**article_data)
                    self.db.add(article)
                    all_articles.append(article)
                except Exception as e:
                    print(f"Error saving article: {e}")
                    continue
        
        self.db.commit()
        print(f"Fetched {len(all_articles)} new articles total.")
        
        return all_articles
    
    def fetch_category(self, category: str, articles_per_source: int = 5) -> list[Article]:
        """Fetch articles from sources in a specific category."""
        self.ensure_sources_exist()
        
        sources = self.db.query(Source).filter(
            and_(Source.active == True, Source.category == category)
        ).all()
        
        all_articles = []
        
        for source in sources:
            print(f"Fetching from {source.name}...")
            
            article_data_list = self.fetch_source_articles(
                source,
                limit=articles_per_source
            )
            
            for article_data in article_data_list:
                try:
                    article = Article(**article_data)
                    self.db.add(article)
                    all_articles.append(article)
                except Exception as e:
                    print(f"Error saving article: {e}")
                    continue
        
        self.db.commit()
        return all_articles
