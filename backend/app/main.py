from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path

from app.config import settings
from app.database import init_db, close_db
from app.api.v1 import auth
from app.services.scheduler import start_scheduler, stop_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    print("Starting up Library Online API...")
    # Note: Database tables will be created by Alembic migrations
    # await init_db()  # Uncomment if you want to create tables without migrations

    # Start background task scheduler
    start_scheduler()

    print("Application started successfully")

    yield

    # Shutdown
    print("Shutting down Library Online API...")

    # Stop background task scheduler
    stop_scheduler()

    await close_db()
    print("Application shut down successfully")


# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Backend API for Library Online - A modern library management system",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler"""
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error": str(exc) if settings.DEBUG else "An error occurred"
        }
    )


# Health check endpoint
@app.get("/", tags=["Health"])
async def root():
    """Root endpoint - API health check"""
    return {
        "message": "Library Online API is running",
        "version": settings.APP_VERSION,
        "status": "healthy"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": settings.APP_VERSION
    }


@app.get("/scheduler/status", tags=["Health"])
async def scheduler_status():
    """Get scheduler status and information"""
    from app.services.scheduler import get_scheduler_status
    return get_scheduler_status()


# Include routers
from app.api.v1 import auth, books, news, book_copies, upload, books_with_upload, users, reservations, reviews, search, loans, authors, cart, borrowing, genres

app.include_router(auth.router, prefix="/api/v1")
app.include_router(books.router, prefix="/api/v1")
app.include_router(news.router, prefix="/api/v1")
app.include_router(book_copies.router, prefix="/api/v1")
app.include_router(upload.router, prefix="/api/v1")
app.include_router(books_with_upload.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(reservations.router, prefix="/api/v1")
app.include_router(reviews.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(loans.router, prefix="/api/v1")
app.include_router(authors.router, prefix="/api/v1")
app.include_router(cart.router, prefix="/api/v1")
app.include_router(borrowing.router, prefix="/api/v1")
app.include_router(genres.router, prefix="/api/v1")

# Mount static files for uploaded content
uploads_dir = Path(settings.UPLOAD_DIR)
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )
