from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from typing import Optional, List
from math import ceil

from app.database import get_db
from app.models.book import Book, Author, Genre
from app.schemas.book import BookResponse, BookListResponse
from app.services.elasticsearch_service import es_service

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("/books", response_model=BookListResponse)
async def search_books(
    q: Optional[str] = Query(None, description="Search query"),
    genres: Optional[str] = Query(None, description="Comma-separated genre names"),
    authors: Optional[str] = Query(None, description="Comma-separated author names"),
    min_rating: Optional[int] = Query(None, ge=1, le=5, description="Minimum rating"),
    max_rating: Optional[int] = Query(None, ge=1, le=5, description="Maximum rating"),
    year_from: Optional[int] = Query(None, description="Publication year from"),
    year_to: Optional[int] = Query(None, description="Publication year to"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """
    Search books with full-text search and filters
    
    Falls back to database search if Elasticsearch is unavailable
    """
    # Try Elasticsearch first
    if es_service.enabled:
        genre_list = genres.split(",") if genres else None
        author_list = authors.split(",") if authors else None
        
        es_result = await es_service.search_books(
            query=q or "",
            genres=genre_list,
            authors=author_list,
            min_rating=min_rating,
            max_rating=max_rating,
            year_from=year_from,
            year_to=year_to,
            page=page,
            page_size=page_size
        )
        
        if es_result["total"] > 0 or q:  # Use ES results if available or if searching
            # Convert ES results to BookResponse
            book_ids = [hit["id"] for hit in es_result["hits"]]
            
            if book_ids:
                # Fetch full book objects from database
                from sqlalchemy.orm import selectinload
                books_query = select(Book).options(
                    selectinload(Book.authors),
                    selectinload(Book.genres),
                    selectinload(Book.keywords)
                ).where(Book.id.in_(book_ids))
                
                result = await db.execute(books_query)
                books = result.scalars().all()
                
                # Maintain ES order
                books_dict = {str(book.id): book for book in books}
                ordered_books = [books_dict[book_id] for book_id in book_ids if book_id in books_dict]
            else:
                ordered_books = []
            
            return BookListResponse(
                items=[BookResponse.model_validate(book) for book in ordered_books],
                total=es_result["total"],
                page=page,
                page_size=page_size,
                total_pages=ceil(es_result["total"] / page_size) if es_result["total"] > 0 else 0
            )
    
    # Fallback to database search
    from sqlalchemy.orm import selectinload
    
    query = select(Book).options(
        selectinload(Book.authors),
        selectinload(Book.genres),
        selectinload(Book.keywords)
    )
    
    filters = []
    
    # Text search (simple LIKE)
    if q:
        search_pattern = f"%{q}%"
        filters.append(
            or_(
                Book.title.ilike(search_pattern),
                Book.description.ilike(search_pattern),
                Book.isbn.ilike(search_pattern)
            )
        )
    
    # Genre filter
    if genres:
        genre_names = [g.strip() for g in genres.split(",")]
        filters.append(
            Book.genres.any(Genre.name.in_(genre_names))
        )
    
    # Author filter
    if authors:
        author_names = [a.strip() for a in authors.split(",")]
        filters.append(
            Book.authors.any(Author.name.in_(author_names))
        )
    
    # Rating filter
    if min_rating is not None:
        filters.append(Book.average_rating >= min_rating)
    if max_rating is not None:
        filters.append(Book.average_rating <= max_rating)
    
    # Year filter
    if year_from is not None:
        filters.append(Book.publication_year >= year_from)
    if year_to is not None:
        filters.append(Book.publication_year <= year_to)
    
    if filters:
        query = query.where(and_(*filters))
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    query = query.order_by(Book.created_at.desc())
    
    # Execute
    result = await db.execute(query)
    books = result.scalars().all()
    
    return BookListResponse(
        items=[BookResponse.model_validate(book) for book in books],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0
    )


@router.get("/suggest")
async def suggest_books(
    q: str = Query(..., min_length=1, description="Search prefix"),
    size: int = Query(10, ge=1, le=50)
):
    """
    Autocomplete suggestions for book titles
    """
    if es_service.enabled:
        suggestions = await es_service.suggest_books(q, size)
        return {"suggestions": suggestions}
    
    # Fallback: return empty
    return {"suggestions": []}
