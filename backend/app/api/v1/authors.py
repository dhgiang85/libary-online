from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import UUID
from math import ceil

from app.database import get_db
from app.models.book import Author, Book
from app.models.user import User
from app.schemas.author import AuthorResponse, AuthorDetailResponse
from app.schemas.book import BookResponse, BookListResponse, AuthorCreate, AuthorUpdate
from app.dependencies import require_librarian
from typing import List


router = APIRouter(prefix="/authors", tags=["Authors"])


@router.get("/", response_model=List[AuthorDetailResponse])
async def get_all_authors(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    search: str = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Get all authors with book counts (with pagination and search)"""
    query = select(Author)

    # Apply search filter
    if search:
        query = query.where(Author.name.ilike(f"%{search}%"))

    query = query.order_by(Author.name.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    authors = result.scalars().all()

    # Get book count for each author
    author_responses = []
    for author in authors:
        book_count_result = await db.execute(
            select(func.count(Book.id))
            .join(Book.authors)
            .where(Author.id == author.id)
        )
        book_count = book_count_result.scalar() or 0

        author_responses.append(AuthorDetailResponse(
            id=author.id,
            name=author.name,
            bio=author.bio,
            created_at=author.created_at,
            book_count=book_count
        ))

    return author_responses


@router.get("/recent", response_model=List[AuthorDetailResponse])
async def get_recent_authors(
    limit: int = Query(6, ge=1, le=20),
    db: AsyncSession = Depends(get_db)
):
    """Get authors with recently added books"""
    # Subquery to find the latest book creation date for each author
    latest_book_subquery = (
        select(
            Author.id.label("author_id"),
            func.max(Book.created_at).label("latest_book_date")
        )
        .join(Book.authors)
        .group_by(Author.id)
        .subquery()
    )

    # Query authors ordered by their latest book date
    query = (
        select(Author)
        .join(latest_book_subquery, Author.id == latest_book_subquery.c.author_id)
        .order_by(latest_book_subquery.c.latest_book_date.desc())
        .limit(limit)
    )

    result = await db.execute(query)
    authors = result.scalars().all()

    # Get book count for each author
    author_responses = []
    for author in authors:
        book_count_result = await db.execute(
            select(func.count(Book.id))
            .join(Book.authors)
            .where(Author.id == author.id)
        )
        book_count = book_count_result.scalar() or 0

        author_responses.append(AuthorDetailResponse(
            id=author.id,
            name=author.name,
            bio=author.bio,
            created_at=author.created_at,
            book_count=book_count
        ))

    return author_responses


@router.post("/", response_model=AuthorResponse, status_code=status.HTTP_201_CREATED)
async def create_author(
    author_data: AuthorCreate,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Create a new author (librarian only)"""
    # Check if author already exists
    existing = await db.execute(select(Author).where(Author.name == author_data.name))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Author with this name already exists"
        )

    new_author = Author(name=author_data.name, bio=author_data.bio)
    db.add(new_author)
    await db.commit()
    await db.refresh(new_author)

    return AuthorResponse.model_validate(new_author)


@router.put("/{author_id}", response_model=AuthorResponse)
async def update_author(
    author_id: UUID,
    author_data: AuthorUpdate,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Update an author (librarian only)"""
    result = await db.execute(select(Author).where(Author.id == author_id))
    author = result.scalar_one_or_none()

    if not author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Author not found"
        )

    # Check if new name conflicts with existing author
    if author_data.name and author_data.name != author.name:
        existing = await db.execute(select(Author).where(Author.name == author_data.name))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Author with this name already exists"
            )
        author.name = author_data.name

    if author_data.bio is not None:
        author.bio = author_data.bio

    await db.commit()
    await db.refresh(author)

    return AuthorResponse.model_validate(author)


@router.delete("/{author_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_author(
    author_id: UUID,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Delete an author (librarian only) - only if no books associated"""
    result = await db.execute(select(Author).where(Author.id == author_id))
    author = result.scalar_one_or_none()

    if not author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Author not found"
        )

    # Check if author has books
    book_count_result = await db.execute(
        select(func.count(Book.id))
        .join(Book.authors)
        .where(Author.id == author_id)
    )
    book_count = book_count_result.scalar() or 0

    if book_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete author with {book_count} books. Remove books first."
        )

    await db.delete(author)
    await db.commit()

    return None


@router.get("/{author_id}", response_model=AuthorDetailResponse)
async def get_author(
    author_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get author details by ID with book count"""
    result = await db.execute(
        select(Author).where(Author.id == author_id)
    )
    author = result.scalar_one_or_none()
    
    if not author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Author not found"
        )
    
    # Get book count
    book_count_result = await db.execute(
        select(func.count(Book.id))
        .join(Book.authors)
        .where(Author.id == author_id)
    )
    book_count = book_count_result.scalar() or 0
    
    return AuthorDetailResponse(
        id=author.id,
        name=author.name,
        bio=author.bio,
        created_at=author.created_at,
        book_count=book_count
    )


@router.get("/{author_id}/books", response_model=BookListResponse)
async def get_author_books(
    author_id: UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Get all books by an author with pagination"""
    # Verify author exists
    author_result = await db.execute(
        select(Author).where(Author.id == author_id)
    )
    author = author_result.scalar_one_or_none()
    
    if not author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Author not found"
        )
    
    # Build query for books by this author
    query = (
        select(Book)
        .join(Book.authors)
        .where(Author.id == author_id)
        .options(
            selectinload(Book.authors),
            selectinload(Book.genres),
            selectinload(Book.keywords)
        )
        .order_by(Book.created_at.desc())
    )
    
    # Get total count
    count_query = select(func.count(Book.id)).join(Book.authors).where(Author.id == author_id)
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    books = result.scalars().all()
    
    return BookListResponse(
        items=[BookResponse.model_validate(book) for book in books],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0
    )
