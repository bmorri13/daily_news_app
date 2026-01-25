from pydantic_settings import BaseSettings
from functools import lru_cache
import os


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Database
    database_url: str = "sqlite:///./data/news.db"
    
    # Anthropic API
    anthropic_api_key: str = ""
    
    # Fetching settings
    articles_per_category: int = 5
    fetch_schedule_hours: int = 24
    
    # Categories
    categories: list[str] = ["cyber", "ai", "cloud", "crypto"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


# RSS Sources by Category
RSS_SOURCES = {
    "cyber": [
        {
            "name": "The Hacker News",
            "url": "https://thehackernews.com",
            "feed_url": "https://feeds.feedburner.com/TheHackersNews"
        },
        {
            "name": "Bleeping Computer",
            "url": "https://www.bleepingcomputer.com",
            "feed_url": "https://www.bleepingcomputer.com/feed/"
        },
        {
            "name": "Krebs on Security",
            "url": "https://krebsonsecurity.com",
            "feed_url": "https://krebsonsecurity.com/feed/"
        },
        {
            "name": "Dark Reading",
            "url": "https://www.darkreading.com",
            "feed_url": "https://www.darkreading.com/rss.xml"
        },
        {
            "name": "SecurityWeek",
            "url": "https://www.securityweek.com",
            "feed_url": "https://feeds.feedburner.com/securityweek"
        }
    ],
    "ai": [
        {
            "name": "TechCrunch AI",
            "url": "https://techcrunch.com/category/artificial-intelligence/",
            "feed_url": "https://techcrunch.com/category/artificial-intelligence/feed/"
        },
        {
            "name": "MIT Technology Review",
            "url": "https://www.technologyreview.com",
            "feed_url": "https://www.technologyreview.com/feed/"
        },
        {
            "name": "VentureBeat AI",
            "url": "https://venturebeat.com/category/ai/",
            "feed_url": "https://venturebeat.com/category/ai/feed/"
        },
        {
            "name": "AI News",
            "url": "https://www.artificialintelligence-news.com",
            "feed_url": "https://www.artificialintelligence-news.com/feed/"
        },
        {
            "name": "The Verge AI",
            "url": "https://www.theverge.com/ai-artificial-intelligence",
            "feed_url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml"
        }
    ],
    "cloud": [
        {
            "name": "AWS Blog",
            "url": "https://aws.amazon.com/blogs/aws/",
            "feed_url": "https://aws.amazon.com/blogs/aws/feed/"
        },
        {
            "name": "Google Cloud Blog",
            "url": "https://cloud.google.com/blog/",
            "feed_url": "https://cloudblog.withgoogle.com/rss/"
        },
        {
            "name": "Azure Blog",
            "url": "https://azure.microsoft.com/en-us/blog/",
            "feed_url": "https://azure.microsoft.com/en-us/blog/feed/"
        },
        {
            "name": "InfoQ Cloud",
            "url": "https://www.infoq.com/cloud-computing/",
            "feed_url": "https://feed.infoq.com/cloud-computing/"
        },
        {
            "name": "The New Stack",
            "url": "https://thenewstack.io",
            "feed_url": "https://thenewstack.io/feed/"
        }
    ],
    "crypto": [
        {
            "name": "CoinTelegraph",
            "url": "https://cointelegraph.com",
            "feed_url": "https://cointelegraph.com/rss"
        },
        {
            "name": "Decrypt",
            "url": "https://decrypt.co",
            "feed_url": "https://decrypt.co/feed"
        },
        {
            "name": "Bitcoin Magazine",
            "url": "https://bitcoinmagazine.com",
            "feed_url": "https://bitcoinmagazine.com/.rss/full/"
        },
        {
            "name": "CoinDesk",
            "url": "https://www.coindesk.com",
            "feed_url": "https://www.coindesk.com/arc/outboundfeeds/rss/"
        },
        {
            "name": "The Block",
            "url": "https://www.theblock.co",
            "feed_url": "https://www.theblock.co/rss.xml"
        }
    ]
}
