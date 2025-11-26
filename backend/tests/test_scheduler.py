"""Tests for the news scheduler service"""
import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from app.models.news import News, NewsCategory
from app.services.scheduler import publish_scheduled_news, get_scheduler_status


@pytest.mark.asyncio
async def test_publish_scheduled_news_publishes_due_items(db_session, test_user):
    """Test that scheduled news items are published when their time arrives"""
    # Create a news item scheduled for the past (should be published)
    past_time = datetime.utcnow() - timedelta(hours=1)
    news_past = News(
        id=uuid4(),
        title="Past Scheduled News",
        content="This should be auto-published",
        summary="Test summary",
        category=NewsCategory.GENERAL,
        author_id=test_user.id,
        published=False,
        published_at=past_time
    )
    db_session.add(news_past)
    
    # Create a news item scheduled for the future (should NOT be published)
    future_time = datetime.utcnow() + timedelta(hours=1)
    news_future = News(
        id=uuid4(),
        title="Future Scheduled News",
        content="This should NOT be auto-published yet",
        summary="Test summary",
        category=NewsCategory.GENERAL,
        author_id=test_user.id,
        published=False,
        published_at=future_time
    )
    db_session.add(news_future)
    
    # Create a news item with no scheduled time (should NOT be published)
    news_no_schedule = News(
        id=uuid4(),
        title="Unscheduled News",
        content="This has no schedule",
        summary="Test summary",
        category=NewsCategory.GENERAL,
        author_id=test_user.id,
        published=False,
        published_at=None
    )
    db_session.add(news_no_schedule)
    
    await db_session.commit()
    
    # Run the scheduler function with the test session
    await publish_scheduled_news(db_session)
    
    # Refresh the items from database
    await db_session.refresh(news_past)
    await db_session.refresh(news_future)
    await db_session.refresh(news_no_schedule)
    
    # Verify only the past scheduled item was published
    assert news_past.published is True, "Past scheduled news should be published"
    assert news_future.published is False, "Future scheduled news should NOT be published"
    assert news_no_schedule.published is False, "Unscheduled news should NOT be published"


@pytest.mark.asyncio
async def test_publish_scheduled_news_handles_no_items(db_session):
    """Test that the function handles the case when there are no items to publish"""
    # Should not raise any errors when there are no items
    await publish_scheduled_news()


@pytest.mark.asyncio
async def test_publish_scheduled_news_current_time(db_session, test_user):
    """Test that news scheduled for exactly now is published"""
    now = datetime.utcnow()
    news_now = News(
        id=uuid4(),
        title="News Scheduled for Now",
        content="This should be published",
        summary="Test summary",
        category=NewsCategory.EVENT,
        author_id=test_user.id,
        published=False,
        published_at=now
    )
    db_session.add(news_now)
    await db_session.commit()
    
    # Run the scheduler function with the test session
    await publish_scheduled_news(db_session)
    
    # Refresh and verify
    await db_session.refresh(news_now)
    assert news_now.published is True, "News scheduled for current time should be published"


def test_get_scheduler_status():
    """Test that scheduler status returns expected structure"""
    status = get_scheduler_status()
    
    assert "running" in status
    assert "enabled" in status
    assert "interval_hours" in status
    assert isinstance(status["running"], bool)
    assert isinstance(status["enabled"], bool)
    assert isinstance(status["interval_hours"], int)
