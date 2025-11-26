from sqlalchemy import Column, String, Text, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.guid import GUID
import uuid
from datetime import datetime
import enum


class NewsCategory(str, enum.Enum):
    """News category enum"""
    EVENT = "EVENT"
    MAINTENANCE = "MAINTENANCE"
    GENERAL = "GENERAL"


class News(Base):
    """News model for library news and announcements"""

    __tablename__ = 'news'

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False, index=True)
    content = Column(Text, nullable=False)
    summary = Column(Text)
    cover_image = Column(String(1000))
    category = Column(Enum(NewsCategory), default=NewsCategory.GENERAL, nullable=False)
    author_id = Column(GUID(), ForeignKey('users.id'), nullable=False)
    published = Column(Boolean, default=False)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    author = relationship('User', back_populates='created_news', foreign_keys=[author_id])
    
    def __repr__(self):
        return f"<News {self.title} ({'Published' if self.published else 'Draft'})>"
