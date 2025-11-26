from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.guid import GUID
import uuid
from datetime import datetime


class User(Base):
    """User model for authentication and authorization"""
    
    __tablename__ = "users"
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(String(20), nullable=False, default="user")  # user, librarian, admin
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_books = relationship("Book", back_populates="creator", foreign_keys="Book.created_by")
    created_news = relationship("News", back_populates="author", foreign_keys="News.author_id")
    borrow_records = relationship("BorrowRecord", back_populates="user")
    reservations = relationship("Reservation", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    cart = relationship("Cart", back_populates="user", uselist=False)
    
    def __repr__(self):
        return f"<User {self.username} ({self.role})>"
