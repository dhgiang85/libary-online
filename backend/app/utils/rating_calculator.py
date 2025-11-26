from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from typing import Dict

from app.models.review import Review
from app.models.book import Book


async def calculate_average_rating(db: AsyncSession, book_id: UUID) -> float:
    """
    Calculate average rating for a book
    
    Args:
        db: Database session
        book_id: Book ID
    
    Returns:
        Average rating (float) or None if no reviews
    """
    result = await db.execute(
        select(func.avg(Review.rating))
        .where(Review.book_id == book_id)
    )
    avg_rating = result.scalar()
    return round(avg_rating, 2) if avg_rating else None


async def update_book_rating(db: AsyncSession, book_id: UUID) -> None:
    """
    Update book's cached average rating and total reviews
    
    Args:
        db: Database session
        book_id: Book ID
    """
    # Get average rating
    avg_rating = await calculate_average_rating(db, book_id)
    
    # Get total reviews count
    count_result = await db.execute(
        select(func.count())
        .where(Review.book_id == book_id)
    )
    total_reviews = count_result.scalar()
    
    # Update book
    book_result = await db.execute(
        select(Book).where(Book.id == book_id)
    )
    book = book_result.scalar_one_or_none()
    
    if book:
        book.average_rating = int(round(avg_rating)) if avg_rating else None
        book.total_reviews = total_reviews
        await db.commit()


async def get_rating_distribution(db: AsyncSession, book_id: UUID) -> Dict[str, int]:
    """
    Get distribution of ratings for a book
    
    Args:
        db: Database session
        book_id: Book ID
    
    Returns:
        Dictionary with rating counts (1-5 stars)
    """
    distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
    
    # Get count for each rating
    for rating in range(1, 6):
        result = await db.execute(
            select(func.count())
            .where(Review.book_id == book_id)
            .where(Review.rating == rating)
        )
        count = result.scalar()
        distribution[str(rating)] = count
    
    return distribution
