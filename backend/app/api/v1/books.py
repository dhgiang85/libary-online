from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID
from math import ceil

from app.database import get_db
from app.models.book import Book, Author, Genre, Keyword
from app.models.book_copy import BookCopy
from app.models.user import User
from app.schemas.book import (
    BookCreate,
    BookUpdate,
    BookResponse,
    BookListResponse,
    BookStats,
    LocationSchema
)
from app.schemas.book_copy import BookCopyResponse
from app.dependencies import get_current_user, require_librarian

router = APIRouter(prefix="/books", tags=["Books"])


async def get_or_create_author(db: AsyncSession, name: str) -> Author:
    """Get existing author or create new one"""
    result = await db.execute(select(Author).where(Author.name == name))
    author = result.scalar_one_or_none()
    if not author:
        author = Author(name=name)
        db.add(author)
    return author


async def get_or_create_genre(db: AsyncSession, name: str) -> Genre:
    """Get existing genre or create new one"""
    result = await db.execute(select(Genre).where(Genre.name == name))
    genre = result.scalar_one_or_none()
    if not genre:
        genre = Genre(name=name)
        db.add(genre)
    return genre


async def get_or_create_keyword(db: AsyncSession, name: str) -> Keyword:
    """Get existing keyword or create new one"""
    result = await db.execute(select(Keyword).where(Keyword.name == name))
    keyword = result.scalar_one_or_none()
    if not keyword:
        keyword = Keyword(name=name)
        db.add(keyword)
    return keyword


@router.get("/", response_model=BookListResponse)
async def get_books(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    genre: Optional[str] = None,
    author: Optional[str] = None,
    sort: Optional[str] = Query(None, description="Sort by: rating_desc, created_at_desc, title_asc"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get paginated list of books with optional filtering and sorting
    
    - **page**: Page number (starts from 1)
    - **page_size**: Number of items per page
    - **search**: Search in title, description, ISBN
    - **genre**: Filter by genre name
    - **author**: Filter by author name
    - **sort**: Sort order (rating_desc, created_at_desc, title_asc)
    """
    # Base query
    query = select(Book).options(
        selectinload(Book.authors),
        selectinload(Book.genres),
        selectinload(Book.keywords),
        selectinload(Book.copies)
    )
    
    # Apply filters
    if search:
        search_filter = or_(
            Book.title.ilike(f"%{search}%"),
            Book.description.ilike(f"%{search}%"),
            Book.isbn.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
    
    if genre:
        query = query.join(Book.genres).where(Genre.name == genre)
    
    if author:
        query = query.join(Book.authors).where(Author.name == author)
    
    # Apply sorting
    if sort == "rating_desc":
        query = query.order_by(Book.average_rating.desc().nullslast())
    elif sort == "created_at_desc":
        query = query.order_by(Book.created_at.desc())
    elif sort == "title_asc":
        query = query.order_by(Book.title.asc())
    else:
        # Default sort by created_at desc
        query = query.order_by(Book.created_at.desc())
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    books = result.scalars().all()
    
    # Convert to response format
    book_responses = []
    for book in books:
        book_responses.append(BookResponse.model_validate({
            **{k: getattr(book, k) for k in ['id', 'title', 'description', 'isbn', 'publisher', 'publication_year', 'pages', 'deposit_fee', 'cover_url', 'created_at', 'updated_at', 'average_rating', 'total_reviews']},
            'authors': book.authors,
            'genres': book.genres,
            'keywords': book.keywords,
            'total_copies': len(book.copies),
            'available_copies': sum(1 for c in book.copies if c.status == 'AVAILABLE'),
            'location': LocationSchema(
                floor=book.floor or '',
                shelf=book.shelf or '',
                row=book.row or ''
            )
        }))
    
    return BookListResponse(
        items=book_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0
    )


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(
    book_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific book by ID"""
    query = select(Book).options(
        selectinload(Book.authors),
        selectinload(Book.genres),
        selectinload(Book.keywords),
        selectinload(Book.copies)
    ).where(Book.id == book_id)
    
    result = await db.execute(query)
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    return BookResponse.model_validate({
        **{k: getattr(book, k) for k in ['id', 'title', 'description', 'isbn', 'publisher', 'publication_year', 'pages', 'deposit_fee', 'cover_url', 'created_at', 'updated_at', 'average_rating', 'total_reviews']},
        'authors': book.authors,
        'genres': book.genres,
        'keywords': book.keywords,
        'total_copies': len(book.copies),
        'available_copies': sum(1 for c in book.copies if c.status == 'AVAILABLE'),
        'location': LocationSchema(
            floor=book.floor or '',
            shelf=book.shelf or '',
            row=book.row or ''
        )
    })


@router.post("/", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create_book(
    book_data: BookCreate,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Create a new book (librarian only)"""
    
    # Check if ISBN already exists
    if book_data.isbn:
        result = await db.execute(select(Book).where(Book.isbn == book_data.isbn))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Book with this ISBN already exists"
            )
    
    # Create book
    new_book = Book(
        title=book_data.title,
        description=book_data.description,
        isbn=book_data.isbn,
        publisher=book_data.publisher,
        publication_year=book_data.publication_year,
        pages=book_data.pages,
        deposit_fee=book_data.deposit_fee or 0,
        cover_url=book_data.cover_url,
        floor=book_data.location.floor,
        shelf=book_data.location.shelf,
        row=book_data.location.row,
        created_by=current_user.id
    )
    
    # Add authors
    for author_name in book_data.authors:
        author = await get_or_create_author(db, author_name)
        new_book.authors.append(author)
    
    # Add genres
    for genre_name in book_data.genres:
        genre = await get_or_create_genre(db, genre_name)
        new_book.genres.append(genre)
    
    # Add keywords
    # Add keywords
    for keyword_name in book_data.keywords:
        keyword = await get_or_create_keyword(db, keyword_name)
        new_book.keywords.append(keyword)
    
    db.add(new_book)
    await db.commit()
    await db.refresh(new_book, ['authors', 'genres', 'keywords'])

    # Create initial copies if requested
    if book_data.initial_copies and book_data.initial_copies > 0:
        from app.models.book_copy import BookCopy, CopyStatus
        import uuid

        for i in range(book_data.initial_copies):
            # Generate a unique barcode
            # Format: ISBN-SEQ or BOOKID-SEQ or UUID
            barcode = f"{new_book.isbn}-{i+1}" if new_book.isbn else f"LIB-{str(uuid.uuid4())[:8].upper()}-{i+1}"
            
            # Ensure barcode is unique (simple check, might need more robust handling in production)
            # For now, using UUID part to ensure uniqueness if ISBN is missing or duplicated logic
            if not new_book.isbn:
                 barcode = f"LIB-{new_book.id.hex[:4].upper()}-{i+1}-{str(uuid.uuid4())[:4].upper()}"

            new_copy = BookCopy(
                book_id=new_book.id,
                barcode=barcode,
                status=CopyStatus.AVAILABLE
            )
            db.add(new_copy)
        
        await db.commit()
    
    return BookResponse.model_validate({
        **{k: getattr(new_book, k) for k in ['id', 'title', 'description', 'isbn', 'publisher', 'publication_year', 'pages', 'deposit_fee', 'cover_url', 'created_at', 'updated_at', 'average_rating', 'total_reviews']},
        'authors': new_book.authors,
        'genres': new_book.genres,
        'keywords': new_book.keywords,
        'location': LocationSchema(
            floor=new_book.floor or '',
            shelf=new_book.shelf or '',
            row=new_book.row or ''
        )
    })


@router.put("/{book_id}", response_model=BookResponse)
async def update_book(
    book_id: UUID,
    book_data: BookUpdate,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Update a book (librarian only)"""
    
    # Get book
    query = select(Book).options(
        selectinload(Book.authors),
        selectinload(Book.genres),
        selectinload(Book.keywords)
    ).where(Book.id == book_id)
    
    result = await db.execute(query)
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Update fields
    update_data = book_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if field == 'authors' and value is not None:
            book.authors.clear()
            for author_name in value:
                author = await get_or_create_author(db, author_name)
                book.authors.append(author)
        elif field == 'genres' and value is not None:
            book.genres.clear()
            for genre_name in value:
                genre = await get_or_create_genre(db, genre_name)
                book.genres.append(genre)
        elif field == 'keywords' and value is not None:
            book.keywords.clear()
            for keyword_name in value:
                keyword = await get_or_create_keyword(db, keyword_name)
                book.keywords.append(keyword)
        elif field == 'location' and value is not None:
            book.floor = value.floor
            book.shelf = value.shelf
            book.row = value.row
        elif field not in ['authors', 'genres', 'keywords', 'location']:
            setattr(book, field, value)
    
    await db.commit()
    await db.refresh(book, ['authors', 'genres', 'keywords'])
    
    return BookResponse.model_validate({
        **{k: getattr(book, k) for k in ['id', 'title', 'description', 'isbn', 'publisher', 'publication_year', 'pages', 'deposit_fee', 'cover_url', 'created_at', 'updated_at', 'average_rating', 'total_reviews']},
        'authors': book.authors,
        'genres': book.genres,
        'keywords': book.keywords,
        'location': LocationSchema(
            floor=book.floor or '',
            shelf=book.shelf or '',
            row=book.row or ''
        )
    })


@router.delete("/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(
    book_id: UUID,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Delete a book (librarian only)"""
    
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    await db.delete(book)
    await db.commit()
    
    return None


@router.get("/{book_id}/stats", response_model=BookStats)
async def get_book_stats(
    book_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get statistics for a specific book"""
    
    # Check if book exists
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()
    
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )
    
    # Get copy statistics
    copies_query = select(BookCopy).where(BookCopy.book_id == book_id)
    copies_result = await db.execute(copies_query)
    copies = copies_result.scalars().all()
    
    stats = {
        'total_copies': len(copies),
        'available': sum(1 for c in copies if c.status == 'AVAILABLE'),
        'borrowed': sum(1 for c in copies if c.status == 'BORROWED'),
        'lost': sum(1 for c in copies if c.status == 'LOST')
    }

    return BookStats(**stats)


@router.get("/{book_id}/copies", response_model=List[BookCopyResponse])
async def get_book_copies(
    book_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get all copies for a specific book"""

    # Check if book exists
    result = await db.execute(select(Book).where(Book.id == book_id))
    book = result.scalar_one_or_none()

    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found"
        )

    # Get all copies
    copies_query = select(BookCopy).where(BookCopy.book_id == book_id)
    copies_result = await db.execute(copies_query)
    copies = copies_result.scalars().all()

    return [BookCopyResponse.model_validate(copy) for copy in copies]
