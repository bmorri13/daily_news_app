from pydantic import BaseModel, HttpUrl
from datetime import datetime, date
from typing import Optional


# Source Schemas
class SourceBase(BaseModel):
    name: str
    url: str
    feed_url: str
    category: str
    active: bool = True


class SourceCreate(SourceBase):
    pass


class Source(SourceBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Article Schemas
class ArticleBase(BaseModel):
    title: str
    url: str
    category: str


class ArticleCreate(ArticleBase):
    source_id: int
    author: Optional[str] = None
    content: Optional[str] = None
    published_at: Optional[datetime] = None


class ArticleSummary(BaseModel):
    """Lightweight article for list views."""
    id: int
    title: str
    url: str
    category: str
    summary: Optional[str] = None
    ai_tags: Optional[list[str]] = None
    sentiment: Optional[str] = None
    relevance_score: Optional[float] = None
    published_at: Optional[datetime] = None
    featured_date: Optional[date] = None
    source_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class Article(ArticleBase):
    id: int
    source_id: int
    author: Optional[str] = None
    content: Optional[str] = None
    published_at: Optional[datetime] = None
    fetched_at: datetime
    summary: Optional[str] = None
    ai_tags: Optional[list[str]] = None
    sentiment: Optional[str] = None
    relevance_score: Optional[float] = None
    processed: bool
    processed_at: Optional[datetime] = None
    featured_date: Optional[date] = None
    source: Optional[Source] = None
    
    class Config:
        from_attributes = True


# Fetch Log Schemas
class FetchLogBase(BaseModel):
    status: str
    articles_fetched: int
    articles_processed: int


class FetchLog(FetchLogBase):
    id: int
    started_at: datetime
    completed_at: Optional[datetime] = None
    errors: Optional[list[str]] = None
    
    class Config:
        from_attributes = True


# API Response Schemas
class DailyDigest(BaseModel):
    """Daily digest with articles grouped by category."""
    date: date
    categories: dict[str, list[ArticleSummary]]
    total_articles: int


class CategoryArticles(BaseModel):
    """Articles for a specific category."""
    category: str
    articles: list[ArticleSummary]
    total: int


class HealthCheck(BaseModel):
    """Health check response."""
    status: str
    database: str
    timestamp: datetime


class FetchTriggerResponse(BaseModel):
    """Response for manual fetch trigger."""
    message: str
    log_id: int
    status: str


# Newsletter Schemas
class NewsletterBase(BaseModel):
    title: str
    url: str


class Newsletter(NewsletterBase):
    """Newsletter with full content and AI summary."""
    id: int
    content: Optional[str] = None
    published_at: Optional[datetime] = None
    fetched_at: datetime
    executive_summary: Optional[str] = None
    processed: bool

    class Config:
        from_attributes = True


class NewsletterTriggerResponse(BaseModel):
    """Response for newsletter fetch trigger."""
    message: str
    newsletter_id: Optional[int] = None
    status: str
