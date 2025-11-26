from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional


class AuthorBase(BaseModel):
    """Base author schema"""
    name: str
    bio: Optional[str] = None


class AuthorResponse(AuthorBase):
    """Author response schema"""
    id: UUID
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class AuthorDetailResponse(AuthorResponse):
    """Author detail response with additional stats"""
    book_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)
