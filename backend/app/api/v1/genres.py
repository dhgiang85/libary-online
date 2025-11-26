from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
from uuid import UUID
from math import ceil

from app.database import get_db
from app.models.book import Genre
from app.models.user import User
from app.schemas.book import GenreCreate, GenreUpdate, GenreResponse
from app.schemas.common import PaginatedResponse
from app.dependencies import require_librarian

router = APIRouter(prefix="/genres", tags=["Genres"])

@router.get("/", response_model=PaginatedResponse[GenreResponse])
async def get_genres(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Get all genres with pagination and search"""
    query = select(Genre)
    
    if search:
        query = query.where(Genre.name.ilike(f"%{search}%"))
        
    query = query.order_by(Genre.name.asc())
    
    # Calculate total
    total_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(total_query) or 0
    
    # Pagination
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    genres = result.scalars().all()
    
    total_pages = ceil(total / page_size) if total > 0 else 0
    
    return PaginatedResponse(
        items=[GenreResponse.model_validate(g) for g in genres],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/all", response_model=List[GenreResponse])
async def get_all_genres(
    db: AsyncSession = Depends(get_db)
):
    """Get all genres without pagination (for dropdowns)"""
    query = select(Genre).order_by(Genre.name.asc())
    result = await db.execute(query)
    genres = result.scalars().all()
    return [GenreResponse.model_validate(g) for g in genres]

@router.post("/", response_model=GenreResponse, status_code=status.HTTP_201_CREATED)
async def create_genre(
    genre_data: GenreCreate,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Create a new genre (librarian only)"""
    # Check if exists
    result = await db.execute(select(Genre).where(Genre.name == genre_data.name))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Genre with this name already exists"
        )
    
    genre = Genre(name=genre_data.name)
    db.add(genre)
    await db.commit()
    await db.refresh(genre)
    return GenreResponse.model_validate(genre)

@router.put("/{genre_id}", response_model=GenreResponse)
async def update_genre(
    genre_id: UUID,
    genre_data: GenreUpdate,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Update a genre (librarian only)"""
    result = await db.execute(select(Genre).where(Genre.id == genre_id))
    genre = result.scalar_one_or_none()
    
    if not genre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Genre not found"
        )
        
    # Check name uniqueness if changed
    if genre_data.name != genre.name:
        existing = await db.execute(select(Genre).where(Genre.name == genre_data.name))
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Genre with this name already exists"
            )
    
    genre.name = genre_data.name
    await db.commit()
    await db.refresh(genre)
    return GenreResponse.model_validate(genre)

@router.delete("/{genre_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_genre(
    genre_id: UUID,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Delete a genre (librarian only)"""
    result = await db.execute(select(Genre).where(Genre.id == genre_id))
    genre = result.scalar_one_or_none()
    
    if not genre:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Genre not found"
        )
    
    # Check if used by any books?
    # SQLAlchemy cascade might handle it, or we might want to prevent deletion if used.
    # For now, let's allow deletion (cascade in model definition handles association table)
    
    await db.delete(genre)
    await db.commit()
    return None
