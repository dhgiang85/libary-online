from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from uuid import UUID
from math import ceil

from app.database import get_db
from app.models.user import User
from app.models.book import Book
from app.models.review import Review
from app.models.book_copy import BorrowRecord
from app.schemas.review import (
    ReviewCreate,
    ReviewUpdate,
    ReviewResponse,
    ReviewListResponse,
    BookRatingStats
)
from app.dependencies import get_current_user
from app.utils.rating_calculator import update_book_rating, get_rating_distribution

router = APIRouter(tags=["Reviews"])


@router.post("/books/{book_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
async def create_review(
    book_id: UUID,
    review_data: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a review for a book (any authenticated user can review)
    """
    # Check if book exists
    book_result = await db.execute(select(Book).where(Book.id == book_id))
    book = book_result.scalar_one_or_none()

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )

    # Note: Removed borrow requirement - any authenticated user can review
    # # Check if user has borrowed this book before
    # borrow_check = await db.execute(
    #     select(func.count())
    #     .where(BorrowRecord.user_id == current_user.id)
    #     .where(BorrowRecord.copy_id.in_(
    #         select(Book.id).join(Book.copies).where(Book.id == book_id)
    #     ))
    # )
    #
    # # Simplified check: just verify user has any borrow record for this book's copies
    # from app.models.book_copy import BookCopy
    # borrow_check = await db.execute(
    #     select(func.count())
    #     .select_from(BorrowRecord)
    #     .join(BookCopy, BorrowRecord.copy_id == BookCopy.id)
    #     .where(BookCopy.book_id == book_id)
    #     .where(BorrowRecord.user_id == current_user.id)
    # )
    #
    # if borrow_check.scalar() == 0:
    #     raise HTTPException(
    #         status_code=status.HTTP_400_BAD_REQUEST,
    #         detail="You can only review books you have borrowed"
    #     )
    
    # Check if user already reviewed this book
    existing_review = await db.execute(
        select(Review).where(
            and_(
                Review.user_id == current_user.id,
                Review.book_id == book_id
            )
        )
    )
    if existing_review.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this book. Use PUT to update your review."
        )
    
    # Create review
    new_review = Review(
        user_id=current_user.id,
        book_id=book_id,
        rating=review_data.rating,
        review_text=review_data.review_text
    )
    
    db.add(new_review)
    await db.commit()
    await db.refresh(new_review)
    
    # Update book's average rating
    await update_book_rating(db, book_id)
    
    return ReviewResponse.model_validate(new_review)


@router.get("/books/{book_id}/reviews", response_model=ReviewListResponse)
async def get_book_reviews(
    book_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("newest", pattern="^(newest|oldest|highest|lowest)$"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all reviews for a book (public)
    
    - **sort_by**: newest, oldest, highest (rating), lowest (rating)
    """
    # Check if book exists
    book_result = await db.execute(select(Book).where(Book.id == book_id))
    if not book_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Base query
    query = select(Review).where(Review.book_id == book_id)
    
    # Apply sorting
    if sort_by == "newest":
        query = query.order_by(Review.created_at.desc())
    elif sort_by == "oldest":
        query = query.order_by(Review.created_at.asc())
    elif sort_by == "highest":
        query = query.order_by(Review.rating.desc(), Review.created_at.desc())
    elif sort_by == "lowest":
        query = query.order_by(Review.rating.asc(), Review.created_at.desc())
    
    # Get total count
    count_query = select(func.count()).where(Review.book_id == book_id)
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    reviews = result.scalars().all()
    
    # Enrich with user info
    review_responses = []
    for review in reviews:
        user_result = await db.execute(select(User).where(User.id == review.user_id))
        user = user_result.scalar_one_or_none()
        
        review_dict = ReviewResponse.model_validate(review).model_dump()
        if user:
            review_dict['user_username'] = user.username
            review_dict['user_full_name'] = user.full_name
        review_responses.append(ReviewResponse(**review_dict))
    
    return ReviewListResponse(
        items=review_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0
    )


@router.put("/reviews/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: UUID,
    review_data: ReviewUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update own review"""
    # Get review
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Check ownership
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own reviews"
        )
    
    # Update fields
    update_data = review_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(review, field, value)
    
    await db.commit()
    await db.refresh(review)
    
    # Update book's average rating
    await update_book_rating(db, review.book_id)
    
    return ReviewResponse.model_validate(review)


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_review(
    review_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete own review"""
    # Get review
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found"
        )
    
    # Check ownership
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own reviews"
        )
    
    book_id = review.book_id
    
    await db.delete(review)
    await db.commit()
    
    # Update book's average rating
    await update_book_rating(db, book_id)
    
    return None


@router.get("/my-reviews", response_model=ReviewListResponse)
async def get_my_reviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user's reviews"""
    # Base query
    query = select(Review).where(Review.user_id == current_user.id)
    query = query.order_by(Review.created_at.desc())
    
    # Get total count
    count_query = select(func.count()).where(Review.user_id == current_user.id)
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    reviews = result.scalars().all()
    
    return ReviewListResponse(
        items=[ReviewResponse.model_validate(r) for r in reviews],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0
    )


@router.get("/books/{book_id}/rating-stats", response_model=BookRatingStats)
async def get_book_rating_stats(
    book_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get rating statistics for a book"""
    # Check if book exists
    book_result = await db.execute(select(Book).where(Book.id == book_id))
    book = book_result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Get rating distribution
    distribution = await get_rating_distribution(db, book_id)
    
    return BookRatingStats(
        average_rating=book.average_rating,
        total_reviews=book.total_reviews,
        rating_distribution=distribution
    )
