from sqlalchemy import Column, String, Integer, Text, ForeignKey, DateTime, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.guid import GUID
import uuid
from datetime import datetime


class Review(Base):
    """Review model for book reviews and ratings"""
    
    __tablename__ = 'reviews'
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey('users.id'), nullable=False)
    book_id = Column(GUID(), ForeignKey('books.id', ondelete='CASCADE'), nullable=False)
    rating = Column(Integer, nullable=False)
    review_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5', name='rating_range_check'),
        UniqueConstraint('user_id', 'book_id', name='unique_user_book_review'),
    )
    
    # Relationships
    user = relationship('User', back_populates='reviews')
    book = relationship('Book', back_populates='reviews')
    
    def __repr__(self):
        return f"<Review {self.id} - {self.rating} stars>"
