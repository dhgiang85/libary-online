from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from uuid import UUID
from math import ceil
from datetime import datetime

from app.database import get_db
from app.models.news import News
from app.models.user import User
from app.schemas.news import (
    NewsCreate,
    NewsUpdate,
    NewsResponse,
    NewsListResponse
)
from app.dependencies import get_current_user, require_librarian

router = APIRouter(prefix="/news", tags=["News"])


@router.get("/", response_model=NewsListResponse)
async def get_news_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    published_only: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    """
    Get paginated list of news
    
    - **page**: Page number (starts from 1)
    - **page_size**: Number of items per page
    - **published_only**: Show only published news (default: True)
    """
    # Base query
    query = select(News)
    
    # Filter published news for public access
    if published_only:
        query = query.where(News.published == True)
    
    # Order by published date (newest first)
    query = query.order_by(News.published_at.desc().nullslast(), News.created_at.desc())
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    # Execute query
    result = await db.execute(query)
    news_items = result.scalars().all()
    
    return NewsListResponse(
        items=[NewsResponse.model_validate(news) for news in news_items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0
    )


@router.get("/{news_id}", response_model=NewsResponse)
async def get_news(
    news_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific news article by ID"""
    result = await db.execute(select(News).where(News.id == news_id))
    news = result.scalar_one_or_none()
    
    if not news:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="News not found"
        )
    
    # Only show published news to public
    # (Authenticated users with librarian role can see drafts)
    if not news.published:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="News not found"
        )
    
    return NewsResponse.model_validate(news)


@router.post("/", response_model=NewsResponse, status_code=status.HTTP_201_CREATED)
async def create_news(
    news_data: NewsCreate,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Create a new news article (librarian only)"""

    # Use provided published_at or default to current time if published
    published_at = news_data.published_at if news_data.published_at else (datetime.utcnow() if news_data.published else None)

    new_news = News(
        title=news_data.title,
        content=news_data.content,
        summary=news_data.summary,
        cover_image=news_data.cover_image,
        category=news_data.category,
        author_id=current_user.id,
        published=news_data.published,
        published_at=published_at
    )

    db.add(new_news)
    await db.commit()
    await db.refresh(new_news)

    return NewsResponse.model_validate(new_news)


@router.put("/{news_id}", response_model=NewsResponse)
async def update_news(
    news_id: UUID,
    news_data: NewsUpdate,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Update a news article (librarian only)"""
    
    result = await db.execute(select(News).where(News.id == news_id))
    news = result.scalar_one_or_none()
    
    if not news:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="News not found"
        )
    
    # Update fields
    update_data = news_data.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        if field == 'published' and value and not news.published:
            # Publishing for the first time
            news.published_at = datetime.utcnow()
        setattr(news, field, value)
    
    await db.commit()
    await db.refresh(news)
    
    return NewsResponse.model_validate(news)


@router.delete("/{news_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_news(
    news_id: UUID,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Delete a news article (librarian only)"""
    
    result = await db.execute(select(News).where(News.id == news_id))
    news = result.scalar_one_or_none()
    
    if not news:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="News not found"
        )
    
    await db.delete(news)
    await db.commit()
    
    return None


@router.post("/{news_id}/publish", response_model=NewsResponse)
async def toggle_publish_news(
    news_id: UUID,
    current_user: User = Depends(require_librarian),
    db: AsyncSession = Depends(get_db)
):
    """Toggle publish status of a news article (librarian only)"""

    result = await db.execute(select(News).where(News.id == news_id))
    news = result.scalar_one_or_none()

    if not news:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="News not found"
        )

    # Toggle published status
    if news.published:
        # Unpublish
        news.published = False
        news.published_at = None
    else:
        # Publish
        news.published = True
        news.published_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(news)
    
    return NewsResponse.model_validate(news)
