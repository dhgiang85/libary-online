"""Background task scheduler for automated news publishing"""
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy import select, update

from app.config import settings
from app.models.news import News

# Configure logging
logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: AsyncIOScheduler | None = None


async def publish_scheduled_news(db=None):
    """
    Check for news items that are scheduled to be published and publish them.
    
    This function:
    1. Finds all news items where published=False and published_at <= now()
    2. Updates them to published=True
    3. Logs the number of items published
    
    Args:
        db: Optional database session for testing. If None, creates its own session.
    """
    try:
        # Use provided session or create a new one
        if db is not None:
            # Use the provided session (for testing)
            await _publish_news_in_session(db)
        else:
            # Create our own session (for production)
            from app.database import AsyncSessionLocal
            
            async with AsyncSessionLocal() as session:
                await _publish_news_in_session(session)
            
    except Exception as e:
        logger.error(f"❌ Error in publish_scheduled_news: {str(e)}", exc_info=True)


async def _publish_news_in_session(db):
    """
    Internal function to publish news within a given session.
    
    Args:
        db: Database session to use
    """
    # Get current time
    now = datetime.utcnow()
    
    # Find news items ready to be published
    query = select(News).where(
        News.published == False,
        News.published_at.isnot(None),
        News.published_at <= now
    )
    
    result = await db.execute(query)
    news_items = result.scalars().all()
    
    if not news_items:
        logger.debug("No scheduled news items ready for publishing")
        return
    
    # Update news items to published
    for item in news_items:
        item.published = True
    
    await db.commit()
    
    logger.info(
        f"✅ Auto-published {len(news_items)} news item(s): "
        f"{', '.join([item.title[:50] for item in news_items])}"
    )


async def check_expired_pickups(db=None):
    """
    Check for pending borrow requests that have expired (older than 48 hours)
    and cancel them automatically.
    """
    try:
        # Use provided session or create a new one
        if db is not None:
            await _cancel_expired_pickups_in_session(db)
        else:
            from app.database import AsyncSessionLocal
            async with AsyncSessionLocal() as session:
                await _cancel_expired_pickups_in_session(session)
            
    except Exception as e:
        logger.error(f"❌ Error in check_expired_pickups: {str(e)}", exc_info=True)


async def _cancel_expired_pickups_in_session(db):
    """
    Internal function to cancel expired pickups within a given session.
    """
    from app.models.book_copy import BorrowRecord, BorrowStatus, CopyStatus
    from datetime import timedelta
    
    # Define expiration threshold (e.g., 48 hours ago)
    expiration_time = datetime.utcnow() - timedelta(hours=48)
    
    # Find expired pending records
    query = select(BorrowRecord).where(
        BorrowRecord.status == BorrowStatus.PENDING,
        BorrowRecord.created_at <= expiration_time
    )
    
    result = await db.execute(query)
    expired_records = result.scalars().all()
    
    if not expired_records:
        return
        
    count = 0
    for record in expired_records:
        # Cancel record
        record.status = BorrowStatus.CANCELLED
        
        # Free up the book copy
        # We need to load the copy relationship or update it directly
        # Since we didn't eager load, let's update via ID if possible or fetch
        # Ideally, we should have eager loaded copy in the query if we access it, 
        # but here we can just update the copy status using its ID from the record
        
        # Update copy status to AVAILABLE
        if record.copy_id:
            from app.models.book_copy import BookCopy
            await db.execute(
                update(BookCopy)
                .where(BookCopy.id == record.copy_id)
                .values(status=CopyStatus.AVAILABLE)
            )
            
        count += 1
    
    await db.commit()
    
    if count > 0:
        logger.info(f"🚫 Auto-cancelled {count} expired pickup request(s)")


def start_scheduler():
    """
    Start the background task scheduler.
    
    Initializes the scheduler and adds the news publishing job
    based on the configured interval.
    """
    global scheduler
    
    if not settings.NEWS_SCHEDULER_ENABLED:
        logger.info("📅 News scheduler is disabled in configuration")
        return
    
    if scheduler is not None:
        logger.warning("Scheduler is already running")
        return
    
    try:
        scheduler = AsyncIOScheduler()
        
        # Add job to publish scheduled news
        scheduler.add_job(
            publish_scheduled_news,
            trigger=IntervalTrigger(hours=settings.NEWS_PUBLISH_INTERVAL_HOURS),
            id="publish_scheduled_news",
            name="Publish Scheduled News",
            replace_existing=True,
            max_instances=1  # Prevent overlapping executions
        )

        # Add job to check for expired pickups (every hour)
        scheduler.add_job(
            check_expired_pickups,
            trigger=IntervalTrigger(hours=1),
            id="check_expired_pickups",
            name="Check Expired Pickups",
            replace_existing=True,
            max_instances=1
        )
        
        scheduler.start()
        
        logger.info(
            f"📅 News scheduler started successfully! "
            f"Checking for scheduled news every {settings.NEWS_PUBLISH_INTERVAL_HOURS} hour(s)"
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to start scheduler: {str(e)}", exc_info=True)
        scheduler = None


def stop_scheduler():
    """
    Stop the background task scheduler.
    
    Gracefully shuts down the scheduler and waits for running jobs to complete.
    """
    global scheduler
    
    if scheduler is None:
        logger.debug("Scheduler is not running")
        return
    
    try:
        scheduler.shutdown(wait=True)
        scheduler = None
        logger.info("📅 News scheduler stopped successfully")
        
    except Exception as e:
        logger.error(f"❌ Error stopping scheduler: {str(e)}", exc_info=True)


def get_scheduler_status() -> dict:
    """
    Get the current status of the scheduler.
    
    Returns:
        dict: Scheduler status information including running state and job details
    """
    if scheduler is None:
        return {
            "running": False,
            "enabled": settings.NEWS_SCHEDULER_ENABLED,
            "interval_hours": settings.NEWS_PUBLISH_INTERVAL_HOURS
        }
    
    jobs = scheduler.get_jobs()
    
    return {
        "running": scheduler.running,
        "enabled": settings.NEWS_SCHEDULER_ENABLED,
        "interval_hours": settings.NEWS_PUBLISH_INTERVAL_HOURS,
        "jobs": [
            {
                "id": job.id,
                "name": job.name,
                "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None
            }
            for job in jobs
        ]
    }
