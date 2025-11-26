from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import joinedload
from typing import Optional

from app.database import get_db
from app.models.book_copy import BorrowRecord, BookCopy, BorrowStatus
from app.models.book import Book
from app.models.user import User
from app.schemas.book_copy import BorrowRecordResponse, BorrowRecordDetailResponse
from app.dependencies import require_librarian
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/loans", tags=["Loans"])

@router.get("/", response_model=PaginatedResponse[BorrowRecordDetailResponse])
async def get_loans(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[BorrowStatus] = None,
    search: Optional[str] = None,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Get all loans (librarian only)"""
    
    # Eager load relationships
    # Eager load relationships
    # Use selectinload for async compatibility and deep loading
    from sqlalchemy.orm import selectinload
    query = select(BorrowRecord).options(
        selectinload(BorrowRecord.user),
        selectinload(BorrowRecord.copy).selectinload(BookCopy.book).selectinload(Book.authors),
        selectinload(BorrowRecord.copy).selectinload(BookCopy.book).selectinload(Book.genres),
        selectinload(BorrowRecord.copy).selectinload(BookCopy.book).selectinload(Book.keywords),
        selectinload(BorrowRecord.copy).selectinload(BookCopy.book).selectinload(Book.copies)
    ).join(User).join(BookCopy).join(Book)
    
    if status:
        query = query.where(BorrowRecord.status == status)
        
    if search:
        # Search by user name, book title, or barcode
        search_filter = (
            User.full_name.ilike(f"%{search}%") |
            User.email.ilike(f"%{search}%") |
            Book.title.ilike(f"%{search}%") |
            BookCopy.barcode.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
        
    # Calculate total
    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query) or 0
    
    # Pagination
    query = query.order_by(desc(BorrowRecord.borrowed_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    loans = result.scalars().all()
    
    total_pages = (total + page_size - 1) // page_size
    
    # We need to manually construct the response if auto-mapping doesn't work deep enough, 
    # but Pydantic's from_attributes (orm_mode) usually handles it if relationships are loaded.
    # However, BorrowRecord model needs to have 'book' property if we want to map it directly to BorrowRecordDetailResponse.book
    # But BorrowRecord has 'copy' which has 'book'.
    # BorrowRecordDetailResponse expects 'book' at top level?
    # Let's check BorrowRecordDetailResponse definition again.
    # class BorrowRecordDetailResponse(BorrowRecordResponse):
    #     book: Optional[BookResponse] = None
    #     user: Optional[UserResponse] = None
    #     copy: Optional[BookCopyResponse] = None
    
    # The SQLAlchemy model BorrowRecord has 'copy' and 'user'. 'copy' has 'book'.
    # So 'book' is not directly on BorrowRecord.
    # We might need to manually map it.
    
    items = []
    for loan in loans:
        item = BorrowRecordDetailResponse.model_validate(loan)
        # Manually populate book from copy.book if available
        if loan.copy and loan.copy.book:
             # We need to validate book to BookResponse
             from app.schemas.book import BookResponse
             item.book = BookResponse.model_validate(loan.copy.book)
        items.append(item)
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/stats")
async def get_loan_stats(
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Get loan statistics"""
    
    # Total active loans
    active_loans = await db.scalar(
        select(func.count()).where(BorrowRecord.status == BorrowStatus.ACTIVE)
    ) or 0
    
    # Overdue loans (active and due_date < now)
    overdue_loans = await db.scalar(
        select(func.count())
        .where(BorrowRecord.status == BorrowStatus.ACTIVE)
        .where(BorrowRecord.due_date < func.now())
    ) or 0
    
    # Returned this week (simple count for now)
    # ...
    
    return {
        "active_loans": active_loans,
        "overdue_loans": overdue_loans,
    }
