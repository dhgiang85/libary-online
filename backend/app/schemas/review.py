from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class ReviewCreate(BaseModel):
    """Schema for creating a new review"""
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5 stars")
    review_text: Optional[str] = Field(None, max_length=2000, description="Review text (optional)")


class ReviewUpdate(BaseModel):
    """Schema for updating a review"""
    rating: Optional[int] = Field(None, ge=1, le=5, description="Rating from 1 to 5 stars")
    review_text: Optional[str] = Field(None, max_length=2000, description="Review text")


class ReviewResponse(BaseModel):
    """Schema for review response"""
    id: UUID
    user_id: UUID
    book_id: UUID
    rating: int
    review_text: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    # Optional user info
    user_username: Optional[str] = None
    user_full_name: Optional[str] = None
    
    model_config = {"from_attributes": True}


class ReviewListResponse(BaseModel):
    """Schema for paginated review list"""
    items: List[ReviewResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class BookRatingStats(BaseModel):
    """Schema for book rating statistics"""
    average_rating: Optional[float] = None
    total_reviews: int = 0
    rating_distribution: dict = Field(
        default_factory=lambda: {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0},
        description="Distribution of ratings (1-5 stars)"
    )
