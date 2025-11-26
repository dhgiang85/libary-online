from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from uuid import UUID


class AuthorBase(BaseModel):
    """Base author schema"""
    name: str = Field(..., min_length=1, max_length=255)
    bio: Optional[str] = None


class AuthorCreate(AuthorBase):
    """Schema for creating a new author"""
    pass


class AuthorUpdate(BaseModel):
    """Schema for updating an author"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    bio: Optional[str] = None


class AuthorResponse(AuthorBase):
    """Author response schema"""
    id: UUID
    created_at: datetime
    
    model_config = {"from_attributes": True}


class GenreBase(BaseModel):
    """Base genre schema"""
    name: str = Field(..., min_length=1, max_length=100)


class GenreCreate(GenreBase):
    """Schema for creating a new genre"""
    pass


class GenreUpdate(BaseModel):
    """Schema for updating a genre"""
    name: str = Field(..., min_length=1, max_length=100)


class GenreResponse(GenreBase):
    """Genre response schema"""
    id: UUID
    created_at: datetime
    
    model_config = {"from_attributes": True}


class KeywordBase(BaseModel):
    """Base keyword schema"""
    name: str = Field(..., min_length=1, max_length=100)


class KeywordResponse(KeywordBase):
    """Keyword response schema"""
    id: UUID
    created_at: datetime
    
    model_config = {"from_attributes": True}


class LocationSchema(BaseModel):
    """Book location schema"""
    floor: str = Field(..., max_length=10)
    shelf: str = Field(..., max_length=10)
    row: str = Field(..., max_length=10)


class BookBase(BaseModel):
    """Base book schema"""
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    isbn: Optional[str] = Field(None, max_length=20)
    publisher: Optional[str] = Field(None, max_length=255)
    publication_year: Optional[int] = Field(None, ge=1000, le=9999)
    pages: Optional[int] = Field(None, ge=1)
    deposit_fee: Optional[int] = Field(0, ge=0)  # Phí đặt cọc (VND)


class BookCreate(BookBase):
    """Schema for creating a new book"""
    authors: List[str] = Field(..., min_length=1)
    genres: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    location: LocationSchema
    cover_url: Optional[str] = Field(None, max_length=1000)
    initial_copies: Optional[int] = Field(0, ge=0)
    deposit_fee: Optional[int] = Field(0, ge=0)  # Phí đặt cọc (VND)


class BookUpdate(BaseModel):
    """Schema for updating a book"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    authors: Optional[List[str]] = None
    genres: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    location: Optional[LocationSchema] = None
    isbn: Optional[str] = Field(None, max_length=20)
    publisher: Optional[str] = Field(None, max_length=255)
    publication_year: Optional[int] = Field(None, ge=1000, le=9999)
    pages: Optional[int] = Field(None, ge=1)
    cover_url: Optional[str] = Field(None, max_length=1000)
    deposit_fee: Optional[int] = Field(None, ge=0)  # Phí đặt cọc (VND)


class BookResponse(BookBase):
    """Schema for book response"""
    id: UUID
    authors: List[AuthorResponse]
    genres: List[GenreResponse]
    keywords: List[KeywordResponse]
    location: LocationSchema
    cover_url: Optional[str]
    total_copies: int = 0
    available_copies: int = 0
    average_rating: Optional[int] = None
    total_reviews: int = 0
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}
    
    @classmethod
    def model_validate(cls, obj, **kwargs):
        """Custom validation to handle location"""
        if hasattr(obj, 'floor'):
            obj_dict = {
                **{k: getattr(obj, k) for k in cls.model_fields.keys() if hasattr(obj, k) and k != 'location'},
                'location': LocationSchema(
                    floor=obj.floor or '',
                    shelf=obj.shelf or '',
                    row=obj.row or ''
                )
            }
            return super().model_validate(obj_dict, **kwargs)
        return super().model_validate(obj, **kwargs)


class BookListResponse(BaseModel):
    """Schema for paginated book list"""
    items: List[BookResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class BookStats(BaseModel):
    """Book statistics schema"""
    total_copies: int
    available: int
    borrowed: int
    lost: int
