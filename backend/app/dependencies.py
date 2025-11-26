from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError
from typing import Optional
from uuid import UUID

from app.database import get_db
from app.models.user import User
from app.utils.security import decode_token
from app.schemas.auth import TokenData

# HTTP Bearer security scheme
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token
    
    Args:
        credentials: HTTP Bearer credentials containing the JWT token
        db: Database session
    
    Returns:
        User object of the authenticated user
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        token = credentials.credentials
        payload = decode_token(token)
        
        # Check token type
        if payload.get("type") != "access":
            raise credentials_exception
        
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        token_data = TokenData(user_id=UUID(user_id))
    except JWTError:
        raise credentials_exception
    except ValueError:
        raise credentials_exception
    
    # Get user from database
    result = await db.execute(select(User).where(User.id == token_data.user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to get current active user
    
    Args:
        current_user: Current user from get_current_user dependency
    
    Returns:
        Active user object
    
    Raises:
        HTTPException: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


def require_role(required_role: str):
    """
    Dependency factory to require specific user role
    
    Args:
        required_role: Required role (user, librarian, admin)
    
    Returns:
        Dependency function that checks user role
    """
    async def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        # Admin has access to everything
        if current_user.role == "admin":
            return current_user
        
        # Librarian has access to librarian and user endpoints
        if required_role == "librarian" and current_user.role in ["librarian", "admin"]:
            return current_user
        
        # Check exact role match
        if current_user.role != required_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role}"
            )
        
        return current_user
    
    return role_checker


# Convenience dependencies
require_librarian = require_role("librarian")
require_admin = require_role("admin")
