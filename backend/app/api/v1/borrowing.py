from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.database import get_db
from app.models.user import User
from app.models.book_copy import BorrowRecord, BorrowStatus, BookCopy
from app.models.book import Book
from app.dependencies import get_current_user, require_librarian
from app.schemas.book import BookResponse, LocationSchema
from pydantic import BaseModel

router = APIRouter(prefix="/borrowing", tags=["Borrowing"])

class BorrowRecordResponse(BaseModel):
    id: UUID
    book_title: str
    book_cover: Optional[str]
    book_authors: List[str]
    copy_barcode: str
    borrowed_at: datetime
    due_date: datetime
    returned_at: Optional[datetime]
    status: BorrowStatus
    deposit_fee: int
    user_full_name: Optional[str] = None
    user_email: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/my-history", response_model=List[BorrowRecordResponse])
async def get_my_borrow_history(
    status: Optional[BorrowStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get borrow history for current user
    """
    query = (
        select(BorrowRecord)
        .options(
            selectinload(BorrowRecord.copy).selectinload(BookCopy.book).selectinload(Book.authors)
        )
        .where(BorrowRecord.user_id == current_user.id)
        .order_by(desc(BorrowRecord.created_at))
    )

    if status:
        query = query.where(BorrowRecord.status == status)

    result = await db.execute(query)
    records = result.scalars().all()

    response = []
    for record in records:
        book = record.copy.book
        response.append(BorrowRecordResponse(
            id=record.id,
            book_title=book.title,
            book_cover=book.cover_url,
            book_authors=[a.name for a in book.authors],
            copy_barcode=record.copy.barcode,
            borrowed_at=record.borrowed_at,
            due_date=record.due_date,
            returned_at=record.returned_at,
            status=record.status,
            deposit_fee=book.deposit_fee or 0
        ))
    
    return response

@router.post("/{record_id}/confirm-pickup", status_code=status.HTTP_200_OK)
async def confirm_pickup(
    record_id: UUID,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Confirm book pickup (Librarian only)
    Changes status from PENDING to ACTIVE
    """
    result = await db.execute(
        select(BorrowRecord).where(BorrowRecord.id == record_id)
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Borrow record not found")

    if record.status != BorrowStatus.PENDING:
        raise HTTPException(status_code=400, detail="Record is not in PENDING status")

    record.status = BorrowStatus.ACTIVE
    record.borrowed_at = datetime.utcnow() # Update borrow time to actual pickup time
    await db.commit()
    
    return {"message": "Pickup confirmed"}

@router.post("/{record_id}/return", status_code=status.HTTP_200_OK)
async def return_book(
    record_id: UUID,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Return book (Librarian only)
    Changes status to RETURNED and updates copy status to AVAILABLE
    """
    result = await db.execute(
        select(BorrowRecord)
        .options(selectinload(BorrowRecord.copy))
        .where(BorrowRecord.id == record_id)
    )
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Borrow record not found")

    if record.status == BorrowStatus.RETURNED:
        raise HTTPException(status_code=400, detail="Book already returned")

    # Update record
    record.status = BorrowStatus.RETURNED
    record.returned_at = datetime.utcnow()

    # Update copy status
    if record.copy:
        from app.models.book_copy import CopyStatus
        record.copy.status = CopyStatus.AVAILABLE

    await db.commit()
    
    return {"message": "Book returned successfully"}


@router.get("/all", response_model=List[BorrowRecordResponse])
async def get_all_borrows(
    status: Optional[BorrowStatus] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all borrow records (Librarian only)
    """
    query = (
        select(BorrowRecord)
        .options(
            selectinload(BorrowRecord.copy).selectinload(BookCopy.book).selectinload(Book.authors),
            selectinload(BorrowRecord.user)
        )
        .order_by(desc(BorrowRecord.created_at))
    )

    if status:
        query = query.where(BorrowRecord.status == status)
        
    if search:
        # Search by book title, user name, or barcode
        # Explicitly join tables for filtering to avoid MissingGreenlet or Cartesian products
        # We use outerjoin to be safe, though inner join should be fine here as records must have copy/user
        query = query.join(BorrowRecord.copy).join(BookCopy.book).join(BorrowRecord.user)
        
        from sqlalchemy import or_
        query = query.where(
            or_(
                Book.title.ilike(f"%{search}%"),
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                BookCopy.barcode.ilike(f"%{search}%")
            )
        )

    # Apply pagination
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    records = result.scalars().all()

    response = []
    for record in records:
        book = record.copy.book
        response.append(BorrowRecordResponse(
            id=record.id,
            book_title=book.title,
            book_cover=book.cover_url,
            book_authors=[a.name for a in book.authors],
            copy_barcode=record.copy.barcode,
            borrowed_at=record.borrowed_at,
            due_date=record.due_date,
            returned_at=record.returned_at,
            status=record.status,
            deposit_fee=book.deposit_fee or 0,
            user_full_name=record.user.full_name,
            user_email=record.user.email
        ))
    
    return response


@router.get("/stats", response_model=dict)
async def get_borrow_stats(
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Get borrowing statistics (Librarian only)
    """
    from sqlalchemy import func
    
    # Total active borrows
    active_count = await db.scalar(
        select(func.count(BorrowRecord.id)).where(BorrowRecord.status == BorrowStatus.ACTIVE)
    )
    
    # Total overdue
    overdue_count = await db.scalar(
        select(func.count(BorrowRecord.id)).where(BorrowRecord.status == BorrowStatus.OVERDUE)
    )
    
    # Pending pickups
    pending_count = await db.scalar(
        select(func.count(BorrowRecord.id)).where(BorrowRecord.status == BorrowStatus.PENDING)
    )
    
    # Returned today
    today = datetime.utcnow().date()
    returned_today = await db.scalar(
        select(func.count(BorrowRecord.id)).where(
            and_(
                BorrowRecord.status == BorrowStatus.RETURNED,
                func.date(BorrowRecord.returned_at) == today
            )
        )
    )
    
    return {
        "active_borrows": active_count,
        "overdue_books": overdue_count,
        "pending_pickups": pending_count,
        "returned_today": returned_today
    }
