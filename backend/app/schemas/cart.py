from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID

from app.schemas.book import BookResponse
from app.schemas.book_copy import BorrowRecordResponse, BorrowRecordDetailResponse


class CartItemCreate(BaseModel):
    """Schema for adding a book to cart"""
    book_id: UUID


class CartItemResponse(BaseModel):
    """Schema for cart item response"""
    id: UUID
    cart_id: UUID
    book_id: UUID
    added_at: datetime
    book: Optional[BookResponse] = None  # Include full book details
    
    model_config = {"from_attributes": True}


class CartResponse(BaseModel):
    """Schema for cart response"""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    items: List[CartItemResponse] = []
    
    model_config = {"from_attributes": True}


class CheckoutRequest(BaseModel):
    """Schema for checkout request"""
    due_date: Optional[datetime] = None  # If not provided, default to 14 days from now


class CheckoutResponse(BaseModel):
    """Schema for checkout response"""
    success: bool
    message: str
    borrow_records: List[BorrowRecordDetailResponse] = []
    failed_books: List[dict] = []  # List of books that failed with reasons
