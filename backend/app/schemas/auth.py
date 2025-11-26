from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


class Token(BaseModel):
    """Token response schema"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Token payload data"""
    user_id: Optional[UUID] = None
    username: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    """Login request schema"""
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)


class RefreshTokenRequest(BaseModel):
    """Refresh token request schema"""
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    """Change password request schema"""
    old_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8)
