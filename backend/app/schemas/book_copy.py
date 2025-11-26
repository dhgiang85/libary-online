from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum
from app.schemas.book import BookResponse
from app.schemas.user import UserResponse
from app.models.book_copy import CopyStatus, BorrowStatus


class BookCopyBase(BaseModel):
    """Base book copy schema"""
    barcode: str = Field(..., min_length=1, max_length=50)
    status: CopyStatus = CopyStatus.AVAILABLE


class BookCopyCreate(BaseModel):
    """Schema for creating a new book copy"""
    book_id: UUID
    barcode: str = Field(..., min_length=1, max_length=50)


class BookCopyUpdate(BaseModel):
    """Schema for updating a book copy"""
    status: Optional[CopyStatus] = None
    barcode: Optional[str] = Field(None, min_length=1, max_length=50)


class BookCopyResponse(BookCopyBase):
    """Schema for book copy response"""
    id: UUID
    book_id: UUID
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class BorrowRecordCreate(BaseModel):
    """Schema for creating a borrow record"""
    copy_id: UUID
    due_date: datetime


class BorrowRecordResponse(BaseModel):
    """Schema for borrow record response"""
    id: UUID
    copy_id: UUID
    user_id: UUID
    borrowed_at: datetime
    due_date: datetime
    returned_at: Optional[datetime]
    status: BorrowStatus
    created_at: datetime
    
    model_config = {"from_attributes": True}


class BorrowRecordListResponse(BaseModel):
    """Schema for paginated borrow record list"""
    items: List[BorrowRecordResponse]
    total: int
    page: int
    page_size: int
    total_pages: int



class BorrowRecordDetailResponse(BorrowRecordResponse):
    """Schema for detailed borrow record response"""
    book: Optional[BookResponse] = None
    user: Optional[UserResponse] = None
    book_copy: Optional[BookCopyResponse] = Field(None, alias="copy")
