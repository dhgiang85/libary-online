"""
Test helpers and utility functions for tests
"""
from datetime import timedelta, datetime
from typing import Dict
from jose import jwt

from app.config import settings
from app.utils.security import create_access_token, create_refresh_token


def create_expired_token(user_id: str, role: str = "user") -> str:
    """
    Create an expired access token for testing.
    
    Args:
        user_id: User ID to encode in token
        role: User role
    
    Returns:
        Expired JWT token
    """
    data = {
        "sub": user_id,
        "role": role,
        "exp": datetime.utcnow() - timedelta(minutes=1),  # Expired 1 minute ago
        "iat": datetime.utcnow() - timedelta(minutes=2),
        "type": "access"
    }
    return jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_invalid_token() -> str:
    """
    Create a malformed/invalid token for testing.
    
    Returns:
        Invalid JWT token
    """
    return "invalid.token.here"


def create_wrong_signature_token(user_id: str, role: str = "user") -> str:
    """
    Create a token with wrong signature for testing.
    
    Args:
        user_id: User ID to encode in token
        role: User role
    
    Returns:
        JWT token with wrong signature
    """
    data = {
        "sub": user_id,
        "role": role,
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "iat": datetime.utcnow(),
        "type": "access"
    }
    # Use wrong secret key
    return jwt.encode(data, "wrong-secret-key", algorithm=settings.ALGORITHM)


def get_auth_headers(token: str) -> Dict[str, str]:
    """
    Generate authentication headers from token.
    
    Args:
        token: JWT token
    
    Returns:
        Dictionary with Authorization header
    """
    return {"Authorization": f"Bearer {token}"}
