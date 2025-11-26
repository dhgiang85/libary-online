from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, cast, Date
from datetime import datetime, timedelta
from typing import List, Dict, Any

from app.database import get_db
from app.models.user import User
from app.models.book import Book
from app.models.book_copy import BorrowRecord, BookCopy, BorrowStatus
from app.models.review import Review
from app.dependencies import require_librarian

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=Dict[str, Any])
async def get_dashboard_stats(
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive dashboard statistics for librarians/admins
    """

    # Total books
    total_books_query = select(func.count()).select_from(Book)
    total_books = await db.scalar(total_books_query) or 0

    # Total book copies
    total_copies_query = select(func.count()).select_from(BookCopy)
    total_copies = await db.scalar(total_copies_query) or 0

    # Available copies
    available_copies_query = select(func.count()).select_from(BookCopy).where(
        BookCopy.status == 'AVAILABLE'
    )
    available_copies = await db.scalar(available_copies_query) or 0

    # Total users
    total_users_query = select(func.count()).select_from(User)
    total_users = await db.scalar(total_users_query) or 0

    # Active borrows (ACTIVE + PENDING)
    active_borrows_query = select(func.count()).select_from(BorrowRecord).where(
        or_(BorrowRecord.status == BorrowStatus.ACTIVE, BorrowRecord.status == BorrowStatus.PENDING)
    )
    active_borrows = await db.scalar(active_borrows_query) or 0

    # Overdue books
    today = datetime.now()
    overdue_query = select(func.count()).select_from(BorrowRecord).where(
        and_(
            BorrowRecord.status == BorrowStatus.ACTIVE,
            BorrowRecord.due_date < today
        )
    )
    overdue_count = await db.scalar(overdue_query) or 0

    # Pending pickups
    pending_pickups_query = select(func.count()).select_from(BorrowRecord).where(
        BorrowRecord.status == BorrowStatus.PENDING
    )
    pending_pickups = await db.scalar(pending_pickups_query) or 0

    # Returned this month
    first_day_of_month = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    returned_this_month_query = select(func.count()).select_from(BorrowRecord).where(
        and_(
            BorrowRecord.status == BorrowStatus.RETURNED,
            BorrowRecord.returned_at >= first_day_of_month
        )
    )
    returned_this_month = await db.scalar(returned_this_month_query) or 0

    # New users this month
    new_users_this_month_query = select(func.count()).select_from(User).where(
        User.created_at >= first_day_of_month
    )
    new_users_this_month = await db.scalar(new_users_this_month_query) or 0

    # Total reviews
    total_reviews_query = select(func.count()).select_from(Review)
    total_reviews = await db.scalar(total_reviews_query) or 0

    # Average book rating
    avg_rating_query = select(func.avg(Book.average_rating)).where(Book.average_rating.isnot(None))
    avg_rating = await db.scalar(avg_rating_query) or 0

    return {
        "library_stats": {
            "total_books": total_books,
            "total_copies": total_copies,
            "available_copies": available_copies,
            "borrowed_copies": total_copies - available_copies,
        },
        "user_stats": {
            "total_users": total_users,
            "new_users_this_month": new_users_this_month,
        },
        "borrow_stats": {
            "active_borrows": active_borrows,
            "overdue_count": overdue_count,
            "pending_pickups": pending_pickups,
            "returned_this_month": returned_this_month,
        },
        "review_stats": {
            "total_reviews": total_reviews,
            "average_rating": round(float(avg_rating), 2) if avg_rating else 0,
        }
    }


@router.get("/borrow-trends", response_model=List[Dict[str, Any]])
async def get_borrow_trends(
    days: int = 30,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Get borrowing trends for the last N days
    """
    today = datetime.now().date()
    start_date = today - timedelta(days=days)

    # Query borrow records grouped by date
    query = select(
        cast(BorrowRecord.borrowed_at, Date).label('date'),
        func.count().label('count')
    ).where(
        BorrowRecord.borrowed_at >= start_date
    ).group_by(
        cast(BorrowRecord.borrowed_at, Date)
    ).order_by(
        cast(BorrowRecord.borrowed_at, Date)
    )

    result = await db.execute(query)
    rows = result.all()

    # Create a dict for quick lookup
    borrow_dict = {row.date: row.count for row in rows}

    # Fill in missing dates with 0
    trends = []
    current_date = start_date
    while current_date <= today:
        trends.append({
            "date": current_date.isoformat(),
            "count": borrow_dict.get(current_date, 0)
        })
        current_date += timedelta(days=1)

    return trends


@router.get("/popular-books", response_model=List[Dict[str, Any]])
async def get_popular_books(
    limit: int = 10,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Get most borrowed books
    """
    query = select(
        Book.id,
        Book.title,
        Book.cover_url,
        func.count(BorrowRecord.id).label('borrow_count')
    ).join(
        BookCopy, BookCopy.book_id == Book.id
    ).join(
        BorrowRecord, BorrowRecord.copy_id == BookCopy.id
    ).group_by(
        Book.id, Book.title, Book.cover_url
    ).order_by(
        func.count(BorrowRecord.id).desc()
    ).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": str(row.id),
            "title": row.title,
            "cover_url": row.cover_url,
            "borrow_count": row.borrow_count
        }
        for row in rows
    ]


@router.get("/popular-genres", response_model=List[Dict[str, Any]])
async def get_popular_genres(
    limit: int = 10,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Get most popular genres based on borrows
    """
    from app.models.book import Genre, book_genres

    query = select(
        Genre.id,
        Genre.name,
        func.count(BorrowRecord.id).label('borrow_count')
    ).join(
        book_genres, book_genres.c.genre_id == Genre.id
    ).join(
        Book, Book.id == book_genres.c.book_id
    ).join(
        BookCopy, BookCopy.book_id == Book.id
    ).join(
        BorrowRecord, BorrowRecord.copy_id == BookCopy.id
    ).group_by(
        Genre.id, Genre.name
    ).order_by(
        func.count(BorrowRecord.id).desc()
    ).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": str(row.id),
            "name": row.name,
            "borrow_count": row.borrow_count
        }
        for row in rows
    ]


@router.get("/active-users", response_model=List[Dict[str, Any]])
async def get_active_users(
    limit: int = 10,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """
    Get most active users (by borrow count)
    """
    query = select(
        User.id,
        User.username,
        User.full_name,
        User.email,
        func.count(BorrowRecord.id).label('borrow_count')
    ).join(
        BorrowRecord, BorrowRecord.user_id == User.id
    ).group_by(
        User.id, User.username, User.full_name, User.email
    ).order_by(
        func.count(BorrowRecord.id).desc()
    ).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            "id": str(row.id),
            "username": row.username,
            "full_name": row.full_name,
            "email": row.email,
            "borrow_count": row.borrow_count
        }
        for row in rows
    ]
