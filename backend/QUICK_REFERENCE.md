# Library Online Backend - Quick Reference

> Tài liệu tham khảo nhanh cho development

## 🚀 Quick Start

```bash
# Activate environment
source venv/bin/activate  # Windows: venv\Scripts\activate

# Run server
uvicorn app.main:app --reload

# Run tests
pytest tests/ -v

# Create migration
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

## 📁 Important Files

- `app/main.py` - Entry point, router registration
- `app/config.py` - Configuration settings
- `app/database.py` - Database setup
- `app/dependencies.py` - Auth & dependencies
- `.env` - Environment variables
- `alembic.ini` - Migration config

## 🔑 Authentication Flow

1. User registers: `POST /api/v1/auth/register`
2. User logs in: `POST /api/v1/auth/login` → gets access_token
3. Use token in header: `Authorization: Bearer <token>`
4. Refresh token: `POST /api/v1/auth/refresh`

## 👥 User Roles

- **User**: Borrow books, create reviews, make reservations
- **Librarian**: Manage books, copies, news, fulfill reservations
- **Admin**: All permissions + user management

## 📊 Database Models

| Model | File | Key Fields |
|-------|------|------------|
| User | `models/user.py` | email, username, role, is_active |
| Book | `models/book.py` | title, isbn, average_rating |
| BookCopy | `models/book_copy.py` | barcode, status |
| BorrowRecord | `models/book_copy.py` | user_id, copy_id, due_date |
| Reservation | `models/reservation.py` | user_id, book_id, status, expires_at |
| Review | `models/review.py` | user_id, book_id, rating (1-5) |
| News | `models/news.py` | title, content, published |

## 🛣️ API Endpoints Cheat Sheet

### Auth
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
GET  /api/v1/auth/me
```

### Books
```
GET    /api/v1/books              # List (public)
GET    /api/v1/books/{id}         # Get one (public)
POST   /api/v1/books              # Create (librarian)
PUT    /api/v1/books/{id}         # Update (librarian)
DELETE /api/v1/books/{id}         # Delete (librarian)
```

### Borrow/Return
```
POST /api/v1/book-copies/{id}/borrow   # Borrow (user)
POST /api/v1/book-copies/{id}/return   # Return (user)
```

### Reservations
```
POST   /api/v1/reservations                    # Create (user)
GET    /api/v1/reservations                    # My reservations (user)
DELETE /api/v1/reservations/{id}               # Cancel (user)
GET    /api/v1/reservations/book/{book_id}     # Queue (librarian)
POST   /api/v1/reservations/{id}/fulfill       # Fulfill (librarian)
```

### Reviews
```
POST   /api/v1/reviews/books/{book_id}/reviews  # Create (user)
GET    /api/v1/reviews/books/{book_id}/reviews  # List (public)
PUT    /api/v1/reviews/{id}                     # Update (user, own)
DELETE /api/v1/reviews/{id}                     # Delete (user, own)
GET    /api/v1/reviews/my-reviews               # My reviews (user)
```

### Users (Admin)
```
GET    /api/v1/users              # List (admin)
GET    /api/v1/users/{id}         # Get (admin)
PUT    /api/v1/users/{id}         # Update (admin)
DELETE /api/v1/users/{id}         # Deactivate (admin)
PUT    /api/v1/users/{id}/role    # Change role (admin)
```

### Search
```
GET /api/v1/search/books?q=python&genres=Programming&min_rating=4
GET /api/v1/search/suggest?q=har
```

## 🔧 Common Tasks

### Add New Endpoint

1. Create route in `app/api/v1/your_feature.py`
2. Add schema in `app/schemas/your_feature.py`
3. Update model if needed in `app/models/`
4. Include router in `app/main.py`:
   ```python
   from app.api.v1 import your_feature
   app.include_router(your_feature.router, prefix="/api/v1")
   ```
5. Write tests in `tests/test_your_feature.py`

### Create Migration

```bash
# Auto-generate migration
alembic revision --autogenerate -m "Add new field"

# Review migration file in alembic/versions/
# Fix any GUID() references to postgresql.UUID(as_uuid=True)

# Apply migration
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

### Add New Dependency

```python
# In app/dependencies.py
async def your_dependency(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Your logic
    return something

# Use in endpoint
@router.get("/endpoint")
async def endpoint(dep = Depends(your_dependency)):
    pass
```

## 🧪 Testing

### Run Tests

```bash
# All tests
pytest tests/ -v

# Specific file
pytest tests/test_books.py -v

# With coverage
pytest tests/ --cov=app --cov-report=html

# Stop on first failure
pytest tests/ -x
```

### Write Test

```python
@pytest.mark.asyncio
async def test_something(
    async_client: AsyncClient,
    user_token: str,
    test_book: Book
):
    response = await async_client.get(
        f"/api/v1/books/{test_book.id}",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
```

## 🐛 Debugging

### Check Database

```python
# In Python shell
from app.database import get_db
from app.models.book import Book
from sqlalchemy import select

async with get_db() as db:
    result = await db.execute(select(Book))
    books = result.scalars().all()
    print(books)
```

### Check Elasticsearch

```bash
# Check if running
curl http://localhost:9200

# Check index
curl http://localhost:9200/books/_search

# Delete index
curl -X DELETE http://localhost:9200/books
```

### Common Errors

**"GUID is not defined"** in migration:
- Replace `app.utils.guid.GUID()` with `postgresql.UUID(as_uuid=True)`
- Add `from sqlalchemy.dialects import postgresql`

**"Database connection failed"**:
- Check PostgreSQL is running: `pg_isready`
- Check DATABASE_URL in .env
- Verify database exists: `psql -l`

**"Token expired"**:
- Get new token via `/api/v1/auth/login`
- Or refresh: `/api/v1/auth/refresh`

## 📦 Dependencies

### Core
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `sqlalchemy` - ORM
- `alembic` - Migrations
- `asyncpg` - PostgreSQL driver

### Auth
- `python-jose` - JWT
- `passlib` - Password hashing
- `bcrypt` - Hashing algorithm

### Optional
- `elasticsearch` - Search engine
- `pillow` - Image processing
- `aiofiles` - Async file I/O

## 🔐 Security Checklist

- [ ] Never commit `.env`
- [ ] Use strong SECRET_KEY in production
- [ ] Set DEBUG=false in production
- [ ] Configure CORS properly
- [ ] Validate all user input
- [ ] Hash passwords with bcrypt
- [ ] Use HTTPS in production
- [ ] Implement rate limiting
- [ ] Sanitize file uploads
- [ ] Regular security updates

## 📝 Code Snippets

### Get Current User

```python
from app.dependencies import get_current_user
from app.models.user import User

@router.get("/endpoint")
async def endpoint(current_user: User = Depends(get_current_user)):
    return {"user": current_user.username}
```

### Require Role

```python
from app.dependencies import require_librarian

@router.post("/endpoint")
async def endpoint(current_user: User = Depends(require_librarian)):
    # Only librarians can access
    pass
```

### Pagination

```python
from math import ceil

page = 1
page_size = 20
offset = (page - 1) * page_size

query = select(Model).offset(offset).limit(page_size)
result = await db.execute(query)
items = result.scalars().all()

total_pages = ceil(total / page_size)
```

### File Upload

```python
from app.utils.file_handler import save_upload_file

file_path = await save_upload_file(
    file=uploaded_file,
    upload_dir="uploads/covers",
    allowed_extensions=["jpg", "png"]
)
```

## 🌐 URLs

- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

## 📚 Documentation Files

- `README.md` - Full documentation
- `BACKEND_SUMMARY.md` - Complete reference
- `QUICK_REFERENCE.md` - This file
- `walkthrough.md` - Latest feature walkthrough
- `implementation_plan.md` - Current plan

---

**Last Updated**: 2025-11-23
