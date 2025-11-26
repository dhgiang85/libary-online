from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from typing import Optional
from uuid import UUID
from math import ceil
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.models.book import Book
from app.models.book_copy import BookCopy
from app.models.reservation import Reservation
from app.schemas.reservation import (
    ReservationCreate,
    ReservationResponse,
    ReservationListResponse,
    ReservationWithDetails,
    ReservationStatus
)
from app.dependencies import get_current_user, require_librarian

router = APIRouter(prefix="/reservations", tags=["Reservations"])


@router.post("/", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
async def create_reservation(
    reservation_data: ReservationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Reserve a book (user)
    
    Users can reserve a book when all copies are currently borrowed.
    Reservations expire after 48 hours.
    """
    # Check if book exists
    result = await db.execute(select(Book).where(Book.id == reservation_data.book_id))
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Check if user already has an active reservation for this book
    existing_reservation = await db.execute(
        select(Reservation).where(
            and_(
                Reservation.user_id == current_user.id,
                Reservation.book_id == reservation_data.book_id,
                Reservation.status == ReservationStatus.PENDING
            )
        )
    )
    if existing_reservation.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an active reservation for this book"
        )
    
    # Check if there are any available copies
    available_copies = await db.execute(
        select(func.count()).where(
            and_(
                BookCopy.book_id == reservation_data.book_id,
                BookCopy.status == "AVAILABLE"
            )
        )
    )
    if available_copies.scalar() > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Book has available copies. Please borrow directly instead of reserving."
        )
    
    # Create reservation
    new_reservation = Reservation(
        user_id=current_user.id,
        book_id=reservation_data.book_id,
        status=ReservationStatus.PENDING,
        reserved_at=datetime.utcnow(),
        expires_at=datetime.utcnow() + timedelta(hours=48)
    )
    
    db.add(new_reservation)
    await db.commit()
    await db.refresh(new_reservation)
    
    return ReservationResponse.model_validate(new_reservation)


@router.get("/", response_model=ReservationListResponse)
async def get_user_reservations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[ReservationStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user's reservations
    
    - **page**: Page number (starts from 1)
    - **page_size**: Number of items per page
    - **status_filter**: Filter by status (PENDING, FULFILLED, CANCELLED, EXPIRED)
    """
    # Base query
    query = select(Reservation).where(Reservation.user_id == current_user.id)
    
    # Apply status filter
    if status_filter:
        query = query.where(Reservation.status == status_filter)
    
    # Order by reserved_at (newest first)
    query = query.order_by(Reservation.reserved_at.desc())
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    reservations = result.scalars().all()
    
    return ReservationListResponse(
        items=[ReservationResponse.model_validate(r) for r in reservations],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0
    )


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_reservation(
    reservation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel own reservation (user)"""
    # Get reservation
    result = await db.execute(
        select(Reservation).where(Reservation.id == reservation_id)
    )
    reservation = result.scalar_one_or_none()
    
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    # Check ownership
    if reservation.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only cancel your own reservations"
        )
    
    # Check if reservation is pending
    if reservation.status != ReservationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel reservation with status: {reservation.status}"
        )
    
    # Cancel reservation
    reservation.status = ReservationStatus.CANCELLED
    await db.commit()
    
    return None


@router.get("/book/{book_id}", response_model=ReservationListResponse)
async def get_book_reservations(
    book_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all reservations for a book (librarian only)
    
    Reservations are ordered by reserved_at (FIFO queue)
    """
    # Check if book exists
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Base query - get pending reservations
    query = select(Reservation).where(
        and_(
            Reservation.book_id == book_id,
            Reservation.status == ReservationStatus.PENDING
        )
    )
    
    # Order by reserved_at (FIFO - first in, first out)
    query = query.order_by(Reservation.reserved_at.asc())
    
    # Get total count
    count_query = select(func.count()).where(
        and_(
            Reservation.book_id == book_id,
            Reservation.status == ReservationStatus.PENDING
        )
    )
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    reservations = result.scalars().all()
    
    return ReservationListResponse(
        items=[ReservationResponse.model_validate(r) for r in reservations],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0
    )


@router.post("/{reservation_id}/fulfill", response_model=ReservationResponse)
async def fulfill_reservation(
    reservation_id: UUID,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark reservation as fulfilled (librarian only)
    
    Used when librarian manually assigns a book to a user with reservation
    """
    # Get reservation
    result = await db.execute(
        select(Reservation).where(Reservation.id == reservation_id)
    )
    reservation = result.scalar_one_or_none()
    
    if not reservation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reservation not found"
        )
    
    # Check if reservation is pending
    if reservation.status != ReservationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot fulfill reservation with status: {reservation.status}"
        )
    
    # Check if reservation has expired
    if reservation.is_expired:
        reservation.status = ReservationStatus.EXPIRED
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reservation has expired"
        )
    
    # Mark as fulfilled
    reservation.status = ReservationStatus.FULFILLED
    reservation.fulfilled_at = datetime.utcnow()
    await db.commit()
    await db.refresh(reservation)
    
    return ReservationResponse.model_validate(reservation)
