from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
import re


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    
    @field_validator('username')
    @classmethod
    def validate_username(cls, v):
        if not re.match(r'^[a-zA-Z0-9_-]+$', v):
            raise ValueError('Username can only contain letters, numbers, underscores and hyphens')
        return v


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(..., min_length=8, max_length=100)
    role: str = Field(default="user", pattern="^(user|librarian|admin)$")
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'[0-9]', v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserUpdate(BaseModel):
    """Schema for updating user information"""
    email: Optional[EmailStr] = None
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    password: Optional[str] = Field(None, min_length=8, max_length=100)
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user response"""
    id: UUID
    role: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}


class UserInDB(UserResponse):
    """Schema for user in database (includes hashed password)"""
    hashed_password: str


class UserDetailResponse(UserResponse):
    """Schema for detailed user response with statistics"""
    total_borrows: Optional[int] = 0
    active_borrows: Optional[int] = 0
    total_reservations: Optional[int] = 0


class UserListResponse(BaseModel):
    """Schema for paginated user list"""
    items: List[UserResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class RoleUpdateRequest(BaseModel):
    """Schema for updating user role"""
    role: str = Field(..., pattern="^(user|librarian|admin)$")

