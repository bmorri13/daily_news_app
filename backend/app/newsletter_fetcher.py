import feedparser
import httpx
from datetime import datetime, timezone
from typing import Optional
from dateutil import parser as date_parser
from sqlalchemy.orm import Session
from bs4 import BeautifulSoup

from app.models import Newsletter


class NewsletterFetcher:
    """Fetches tl;dr sec newsletter content."""

    FEED_URL = "https://rss.beehiiv.com/feeds/xgTKUmMmUm.xml"

    def __init__(self, db: Session):
        self.db = db
        self.timeout = 30.0

    def fetch_feed(self) -> Optional[feedparser.FeedParserDict]:
        """Fetch and parse the tl;dr sec RSS feed."""
        try:
            with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                response = client.get(self.FEED_URL, headers={
                    "User-Agent": "NewsAggregator/1.0"
                })
                response.raise_for_status()

            feed = feedparser.parse(response.text)

            if feed.bozo and not feed.entries:
                print(f"Warning: Feed has parsing issues: {feed.bozo_exception}")
                return None

            return feed

        except httpx.HTTPError as e:
            print(f"HTTP error fetching newsletter feed: {e}")
            return None
        except Exception as e:
            print(f"Error fetching newsletter feed: {e}")
            return None

    def parse_published_date(self, entry: dict) -> Optional[datetime]:
        """Parse the published date from an RSS entry."""
        date_fields = ['published', 'updated', 'created', 'pubDate']

        for field in date_fields:
            if field in entry:
                try:
                    parsed = date_parser.parse(entry[field])
                    if parsed.tzinfo is None:
                        parsed = parsed.replace(tzinfo=timezone.utc)
                    return parsed
                except (ValueError, TypeError):
                    continue

        if hasattr(entry, 'published_parsed') and entry.published_parsed:
            try:
                return datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
            except (TypeError, ValueError):
                pass

        return None

    def fetch_full_content(self, url: str) -> Optional[str]:
        """Fetch the full newsletter content from its URL."""
        try:
            with httpx.Client(timeout=self.timeout, follow_redirects=True) as client:
                response = client.get(url, headers={
                    "User-Agent": "NewsAggregator/1.0"
                })
                response.raise_for_status()

            # Parse HTML and extract main content
            soup = BeautifulSoup(response.text, 'html.parser')

            # Try to find the main content area
            # Beehiiv newsletters typically have content in article or main tags
            content_selectors = [
                'article',
                'main',
                '.post-content',
                '.newsletter-content',
                '[data-content]',
                '.content'
            ]

            content = None
            for selector in content_selectors:
                element = soup.select_one(selector)
                if element:
                    content = str(element)
                    break

            # Fallback to body if no specific content found
            if not content:
                body = soup.find('body')
                if body:
                    # Remove script and style tags
                    for tag in body.find_all(['script', 'style', 'nav', 'header', 'footer']):
                        tag.decompose()
                    content = str(body)

            return content

        except httpx.HTTPError as e:
            print(f"HTTP error fetching newsletter content: {e}")
            return None
        except Exception as e:
            print(f"Error fetching newsletter content: {e}")
            return None

    def fetch_latest(self) -> Optional[Newsletter]:
        """Fetch the latest newsletter from the RSS feed."""
        print("Fetching tl;dr sec newsletter...")

        feed = self.fetch_feed()
        if not feed or not feed.entries:
            print("No newsletter entries found.")
            return None

        # Get the latest entry
        latest_entry = feed.entries[0]
        url = latest_entry.get('link', '')

        if not url:
            print("No URL found in latest newsletter entry.")
            return None

        # Check if we already have this newsletter
        existing = self.db.query(Newsletter).filter(Newsletter.url == url).first()
        if existing:
            print(f"Newsletter already exists: {existing.title[:50]}...")
            return existing

        # Fetch full content
        print(f"Fetching full content from: {url}")
        full_content = self.fetch_full_content(url)

        # Extract content from RSS entry as fallback
        rss_content = ''
        if 'content' in latest_entry and latest_entry.content:
            rss_content = latest_entry.content[0].get('value', '')
        elif 'summary' in latest_entry:
            rss_content = latest_entry.summary

        # Use full content if available, otherwise use RSS content
        content = full_content if full_content else rss_content

        # Create newsletter record
        newsletter = Newsletter(
            title=latest_entry.get('title', 'tl;dr sec Newsletter'),
            url=url,
            content=content,
            published_at=self.parse_published_date(latest_entry),
            fetched_at=datetime.now(timezone.utc),
            processed=False
        )

        self.db.add(newsletter)
        self.db.commit()
        self.db.refresh(newsletter)

        print(f"Fetched new newsletter: {newsletter.title[:50]}...")
        return newsletter

    def get_latest(self) -> Optional[Newsletter]:
        """Get the most recent newsletter from the database."""
        return self.db.query(Newsletter).order_by(
            Newsletter.published_at.desc()
        ).first()
