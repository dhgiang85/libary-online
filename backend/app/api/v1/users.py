from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import Optional
from uuid import UUID
from math import ceil

from app.database import get_db
from app.models.user import User
from app.models.book_copy import BorrowRecord
from app.models.reservation import Reservation
from app.schemas.user import (
    UserResponse,
    UserUpdate,
    UserListResponse,
    UserDetailResponse,
    RoleUpdateRequest
)
from app.schemas.book_copy import BorrowRecordResponse, BorrowRecordListResponse
from app.dependencies import require_admin
from app.utils.security import hash_password

router = APIRouter(prefix="/users", tags=["User Management"])


@router.get("/", response_model=UserListResponse)
async def get_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[str] = Query(None, pattern="^(user|librarian|admin)$"),
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get paginated list of users (admin only)
    
    - **page**: Page number (starts from 1)
    - **page_size**: Number of items per page
    - **role**: Filter by role (user, librarian, admin)
    - **is_active**: Filter by active status
    - **search**: Search in username and email
    """
    # Base query
    query = select(User)
    
    # Apply filters
    if role:
        query = query.where(User.role == role)
    
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.full_name.ilike(search_pattern)
            )
        )
    
    # Order by created_at
    query = query.order_by(User.created_at.desc())
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    users = result.scalars().all()
    
    return UserListResponse(
        items=[UserResponse.model_validate(user) for user in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0
    )


@router.get("/{user_id}", response_model=UserDetailResponse)
async def get_user(
    user_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get user details with statistics (admin only)"""
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get borrow statistics
    total_borrows_result = await db.execute(
        select(func.count()).where(BorrowRecord.user_id == user_id)
    )
    total_borrows = total_borrows_result.scalar() or 0
    
    active_borrows_result = await db.execute(
        select(func.count()).where(
            BorrowRecord.user_id == user_id,
            BorrowRecord.status == "ACTIVE"
        )
    )
    active_borrows = active_borrows_result.scalar() or 0
    
    # Get reservation statistics
    total_reservations_result = await db.execute(
        select(func.count()).where(Reservation.user_id == user_id)
    )
    total_reservations = total_reservations_result.scalar() or 0
    
    return UserDetailResponse(
        **UserResponse.model_validate(user).model_dump(),
        total_borrows=total_borrows,
        active_borrows=active_borrows,
        total_reservations=total_reservations
    )


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update user information (admin only)"""
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update fields
    update_data = user_data.model_dump(exclude_unset=True)
    
    # Check email uniqueness if updating
    if 'email' in update_data and update_data['email'] != user.email:
        email_check = await db.execute(
            select(User).where(User.email == update_data['email'])
        )
        if email_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Check username uniqueness if updating
    if 'username' in update_data and update_data['username'] != user.username:
        username_check = await db.execute(
            select(User).where(User.username == update_data['username'])
        )
        if username_check.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Hash password if updating
    if 'password' in update_data:
        update_data['hashed_password'] = hash_password(update_data.pop('password'))
    
    # Apply updates
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: UUID,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate user (soft delete, admin only)"""
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deactivating self
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    # Check for active borrows
    active_borrows = await db.execute(
        select(func.count()).where(
            BorrowRecord.user_id == user_id,
            BorrowRecord.status == "ACTIVE"
        )
    )
    if active_borrows.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate user with active borrows"
        )
    
    # Deactivate user
    user.is_active = False
    await db.commit()
    
    return None


@router.put("/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: UUID,
    role_data: RoleUpdateRequest,
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Change user role (admin only)"""
    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent changing own role
    if user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )
    
    # Update role
    user.role = role_data.role
    await db.commit()
    await db.refresh(user)
    
    return UserResponse.model_validate(user)


@router.get("/{user_id}/borrow-history", response_model=BorrowRecordListResponse)
async def get_user_borrow_history(
    user_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get user's borrow history (admin only)"""
    # Check if user exists
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Base query
    query = select(BorrowRecord).where(BorrowRecord.user_id == user_id)
    query = query.order_by(BorrowRecord.borrowed_at.desc())
    
    # Get total count
    count_query = select(func.count()).where(BorrowRecord.user_id == user_id)
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    records = result.scalars().all()
    
    return BorrowRecordListResponse(
        items=[BorrowRecordResponse.model_validate(record) for record in records],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0
    )
