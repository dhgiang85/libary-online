from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID
from datetime import datetime, timedelta

from app.database import get_db
from app.models.book_copy import BookCopy, BorrowRecord
from app.models.book import Book
from app.models.user import User
from app.models.reservation import Reservation
from app.schemas.book_copy import (
    BookCopyCreate,
    BookCopyUpdate,
    BookCopyResponse,
    BorrowRecordCreate,
    BorrowRecordResponse,
    CopyStatus,
    BorrowStatus
)
from app.dependencies import get_current_user, require_librarian

router = APIRouter(prefix="/book-copies", tags=["Book Copies"])


@router.post("/", response_model=BookCopyResponse, status_code=status.HTTP_201_CREATED)
async def create_book_copy(
    copy_data: BookCopyCreate,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Create a new book copy (librarian only)"""
    
    # Check if book exists
    result = await db.execute(select(Book).where(Book.id == copy_data.book_id))
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Check if barcode already exists
    result = await db.execute(select(BookCopy).where(BookCopy.barcode == copy_data.barcode))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Barcode already exists"
        )
    
    new_copy = BookCopy(
        book_id=copy_data.book_id,
        barcode=copy_data.barcode,
        status=CopyStatus.AVAILABLE
    )
    
    db.add(new_copy)
    await db.commit()
    await db.refresh(new_copy)
    
    return BookCopyResponse.model_validate(new_copy)


@router.get("/{copy_id}", response_model=BookCopyResponse)
async def get_book_copy(
    copy_id: UUID,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific book copy by ID (librarian only)"""
    result = await db.execute(select(BookCopy).where(BookCopy.id == copy_id))
    copy = result.scalar_one_or_none()
    
    if not copy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book copy not found"
        )
    
    return BookCopyResponse.model_validate(copy)


@router.put("/{copy_id}", response_model=BookCopyResponse)
async def update_book_copy(
    copy_id: UUID,
    copy_data: BookCopyUpdate,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Update a book copy (librarian only)"""
    
    result = await db.execute(select(BookCopy).where(BookCopy.id == copy_id))
    copy = result.scalar_one_or_none()
    
    if not copy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book copy not found"
        )
    
    # Update fields
    update_data = copy_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(copy, field, value)
    
    await db.commit()
    await db.refresh(copy)
    
    return BookCopyResponse.model_validate(copy)


@router.delete("/{copy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book_copy(
    copy_id: UUID,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Delete a book copy (librarian only)"""
    
    result = await db.execute(select(BookCopy).where(BookCopy.id == copy_id))
    copy = result.scalar_one_or_none()
    
    if not copy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book copy not found"
        )
    
    # Check if copy is currently borrowed
    if copy.status == CopyStatus.BORROWED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete a borrowed book copy"
        )
    
    await db.delete(copy)
    await db.commit()
    
    return None


@router.post("/{copy_id}/borrow", response_model=BorrowRecordResponse)
async def borrow_book(
    copy_id: UUID,
    borrow_data: BorrowRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Borrow a book copy"""
    
    # Get book copy
    result = await db.execute(select(BookCopy).where(BookCopy.id == copy_id))
    copy = result.scalar_one_or_none()
    
    if not copy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book copy not found"
        )
    
    # Check if copy is available
    if copy.status != CopyStatus.AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Book copy is not available (current status: {copy.status})"
        )
    
    # Create borrow record
    borrow_record = BorrowRecord(
        copy_id=copy_id,
        user_id=current_user.id,
        due_date=borrow_data.due_date,
        status=BorrowStatus.ACTIVE
    )
    
    # Update copy status
    copy.status = CopyStatus.BORROWED
    
    db.add(borrow_record)
    await db.commit()
    await db.refresh(borrow_record)
    
    return BorrowRecordResponse.model_validate(borrow_record)


@router.post("/{copy_id}/return", response_model=BorrowRecordResponse)
async def return_book(
    copy_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Return a borrowed book copy"""
    
    # Get book copy
    result = await db.execute(select(BookCopy).where(BookCopy.id == copy_id))
    copy = result.scalar_one_or_none()
    
    if not copy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book copy not found"
        )
    
    # Get active borrow record
    result = await db.execute(
        select(BorrowRecord)
        .where(BorrowRecord.copy_id == copy_id)
        .where(BorrowRecord.user_id == current_user.id)
        .where(BorrowRecord.status == BorrowStatus.ACTIVE)
    )
    borrow_record = result.scalar_one_or_none()
    
    if not borrow_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active borrow record found for this book copy"
        )
    
    # Update borrow record
    borrow_record.returned_at = datetime.utcnow()
    borrow_record.status = BorrowStatus.RETURNED
    
    # Update copy status
    copy.status = CopyStatus.AVAILABLE
    
    # Check for pending reservations for this book
    reservation_result = await db.execute(
        select(Reservation)
        .where(Reservation.book_id == copy.book_id)
        .where(Reservation.status == "PENDING")
        .order_by(Reservation.reserved_at.asc())  # FIFO - first in, first out
        .limit(1)
    )
    first_reservation = reservation_result.scalar_one_or_none()
    
    # If there's a pending reservation, fulfill it
    if first_reservation:
        # Check if reservation has not expired
        if not first_reservation.is_expired:
            first_reservation.status = "FULFILLED"
            first_reservation.fulfilled_at = datetime.utcnow()
            # Note: In a real system, you would send an email/notification here
    
    await db.commit()
    await db.refresh(borrow_record)
    
    return BorrowRecordResponse.model_validate(borrow_record)

