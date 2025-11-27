from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.guid import GUID
import uuid
from datetime import datetime, timedelta


class Reservation(Base):
    """Reservation model for book reservations"""
    
    __tablename__ = 'reservations'
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey('users.id'), nullable=False)
    book_id = Column(GUID(), ForeignKey('books.id', ondelete='CASCADE'), nullable=False)
    status = Column(String(20), default='PENDING')  # PENDING, FULFILLED, CANCELLED, EXPIRED
    reserved_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    fulfilled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship('User', back_populates='reservations')
    book = relationship('Book', back_populates='reservations')
    
    def __repr__(self):
        return f"<Reservation {self.id} ({self.status})>"
    
    @property
    def is_expired(self) -> bool:
        """Check if reservation has expired"""
        return self.status == 'PENDING' and datetime.utcnow() > self.expires_at
