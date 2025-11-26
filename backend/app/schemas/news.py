from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


class NewsCategory(str, Enum):
    """News category enum"""
    EVENT = "EVENT"
    MAINTENANCE = "MAINTENANCE"
    GENERAL = "GENERAL"


class NewsBase(BaseModel):
    """Base news schema"""
    title: str = Field(..., min_length=1, max_length=500)
    content: str = Field(..., min_length=1)
    summary: Optional[str] = None
    cover_image: Optional[str] = Field(None, max_length=1000)
    category: NewsCategory = NewsCategory.GENERAL


class NewsCreate(NewsBase):
    """Schema for creating news"""
    published: bool = False
    published_at: Optional[datetime] = None


class NewsUpdate(BaseModel):
    """Schema for updating news"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    content: Optional[str] = Field(None, min_length=1)
    summary: Optional[str] = None
    cover_image: Optional[str] = Field(None, max_length=1000)
    category: Optional[NewsCategory] = None
    published: Optional[bool] = None
    published_at: Optional[datetime] = None


class NewsResponse(NewsBase):
    """Schema for news response"""
    id: UUID
    author_id: UUID
    published: bool
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NewsListResponse(BaseModel):
    """Schema for paginated news list"""
    items: List[NewsResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
