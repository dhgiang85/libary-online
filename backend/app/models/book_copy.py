from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.guid import GUID
import uuid
from datetime import datetime
import enum

class CopyStatus(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BORROWED = "BORROWED"
    LOST = "LOST"

class BorrowStatus(str, enum.Enum):
    PENDING = "PENDING"  # Reserved online, waiting for pickup
    ACTIVE = "ACTIVE"    # Picked up, currently borrowed
    RETURNED = "RETURNED"
    OVERDUE = "OVERDUE"
    CANCELLED = "CANCELLED" # Auto-cancelled or manually cancelled


class BookCopy(Base):
    """Book copy model representing physical copies of books"""
    
    __tablename__ = 'book_copies'
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    book_id = Column(GUID(), ForeignKey('books.id', ondelete='CASCADE'), nullable=False)
    barcode = Column(String(50), unique=True, nullable=False, index=True)
    status = Column(String(20), default='AVAILABLE')  # AVAILABLE, BORROWED, LOST
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    book = relationship('Book', back_populates='copies')
    borrow_records = relationship('BorrowRecord', back_populates='copy', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f"<BookCopy {self.barcode} ({self.status})>"


class BorrowRecord(Base):
    """Borrow record model for tracking book loans"""
    
    __tablename__ = 'borrow_records'
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    copy_id = Column(GUID(), ForeignKey('book_copies.id'), nullable=False)
    user_id = Column(GUID(), ForeignKey('users.id'), nullable=False)
    borrowed_at = Column(DateTime, default=datetime.utcnow)
    due_date = Column(DateTime, nullable=False)
    returned_at = Column(DateTime, nullable=True)
    status = Column(String(20), default='ACTIVE')  # ACTIVE, RETURNED, OVERDUE
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    copy = relationship('BookCopy', back_populates='borrow_records')
    user = relationship('User', back_populates='borrow_records')
    
    def __repr__(self):
        return f"<BorrowRecord {self.id} ({self.status})>"
