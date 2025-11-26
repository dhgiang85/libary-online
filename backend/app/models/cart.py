from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
from app.utils.guid import GUID
import uuid
from datetime import datetime


class Cart(Base):
    """Cart model for user shopping cart"""
    
    __tablename__ = 'carts'
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship('User', back_populates='cart')
    items = relationship('CartItem', back_populates='cart', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f"<Cart {self.id} (User: {self.user_id})>"


class CartItem(Base):
    """Cart item model for books in cart"""
    
    __tablename__ = 'cart_items'
    
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    cart_id = Column(GUID(), ForeignKey('carts.id', ondelete='CASCADE'), nullable=False)
    book_id = Column(GUID(), ForeignKey('books.id', ondelete='CASCADE'), nullable=False)
    added_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    cart = relationship('Cart', back_populates='items')
    book = relationship('Book')
    
    def __repr__(self):
        return f"<CartItem {self.id} (Book: {self.book_id})>"
