from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, 
    Float, Date, ForeignKey, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Source(Base):
    """RSS feed sources."""
    __tablename__ = "sources"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    feed_url = Column(String(500), nullable=False, unique=True)
    category = Column(String(50), nullable=False, index=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    articles = relationship("Article", back_populates="source")
    
    def __repr__(self):
        return f"<Source(name='{self.name}', category='{self.category}')>"


class Article(Base):
    """News articles fetched from RSS feeds."""
    __tablename__ = "articles"
    
    id = Column(Integer, primary_key=True, index=True)
    source_id = Column(Integer, ForeignKey("sources.id"), nullable=False)
    
    # Original article data
    title = Column(String(500), nullable=False)
    url = Column(String(1000), nullable=False)
    author = Column(String(255), nullable=True)
    content = Column(Text, nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # AI-generated fields
    summary = Column(Text, nullable=True)
    key_points = Column(JSON, nullable=True)  # List of 3-5 distinct key points
    ai_tags = Column(JSON, nullable=True)  # List of tags
    sentiment = Column(String(20), nullable=True)  # positive, neutral, negative
    relevance_score = Column(Float, nullable=True)  # 0.0 - 1.0
    processed = Column(Boolean, default=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Categorization and featuring
    category = Column(String(50), nullable=False, index=True)
    featured_date = Column(Date, nullable=True, index=True)  # Date when featured
    
    # Relationship
    source = relationship("Source", back_populates="articles")
    
    # Ensure unique articles by URL
    __table_args__ = (
        UniqueConstraint('url', name='uq_article_url'),
    )
    
    def __repr__(self):
        return f"<Article(title='{self.title[:50]}...', category='{self.category}')>"


class FetchLog(Base):
    """Log of fetch operations for debugging and monitoring."""
    __tablename__ = "fetch_logs"

    id = Column(Integer, primary_key=True, index=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(20), default="running")  # running, completed, failed
    articles_fetched = Column(Integer, default=0)
    articles_processed = Column(Integer, default=0)
    errors = Column(JSON, nullable=True)  # List of error messages

    def __repr__(self):
        return f"<FetchLog(status='{self.status}', fetched={self.articles_fetched})>"


class Newsletter(Base):
    """Newsletter content from tl;dr sec."""
    __tablename__ = "newsletters"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(500), nullable=False)
    url = Column(String(1000), nullable=False, unique=True)
    content = Column(Text, nullable=True)  # Full HTML/text content
    published_at = Column(DateTime(timezone=True), nullable=True)
    fetched_at = Column(DateTime(timezone=True), server_default=func.now())
    executive_summary = Column(Text, nullable=True)  # AI-generated summary
    processed = Column(Boolean, default=False)

    def __repr__(self):
        return f"<Newsletter(title='{self.title[:50]}...', processed={self.processed})>"
