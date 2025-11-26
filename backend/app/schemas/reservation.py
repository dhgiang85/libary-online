from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class ReservationStatus(str, Enum):
    """Reservation status enum"""
    PENDING = "PENDING"
    FULFILLED = "FULFILLED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class ReservationCreate(BaseModel):
    """Schema for creating a new reservation"""
    book_id: UUID


class ReservationResponse(BaseModel):
    """Schema for reservation response"""
    id: UUID
    user_id: UUID
    book_id: UUID
    status: ReservationStatus
    reserved_at: datetime
    expires_at: datetime
    fulfilled_at: Optional[datetime]
    created_at: datetime
    
    model_config = {"from_attributes": True}


class ReservationWithDetails(ReservationResponse):
    """Schema for reservation with user and book details"""
    user_username: Optional[str] = None
    user_email: Optional[str] = None
    book_title: Optional[str] = None
    book_isbn: Optional[str] = None


class ReservationListResponse(BaseModel):
    """Schema for paginated reservation list"""
    items: List[ReservationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
