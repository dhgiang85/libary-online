# Library Online - Backend API

FastAPI backend for Library Online, a modern library management system.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with role-based access control (User, Librarian, Admin)
- **Book Management**: Complete CRUD operations for books with authors, genres, and keywords
- **Book Copy Management**: Track individual book copies with barcode system
- **Borrow/Return System**: Users can borrow and return books
- **News Management**: Librarians can create and publish news articles
- **Search & Filtering**: Advanced search and filtering capabilities
- **Pagination**: All list endpoints support pagination
- **API Documentation**: Auto-generated Swagger UI and ReDoc

## 📋 Prerequisites

- Python 3.10+
- PostgreSQL 14+
- pip or poetry

## 🛠️ Installation

### 1. Clone the repository

```bash
cd backend
```

### 2. Create virtual environment

```bash
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Setup environment variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env` file:

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:5432/library_db

# Security
SECRET_KEY=your-very-secret-key-min-32-characters-long

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 5. Create database

```bash
# Using psql
createdb library_db

# Or using PostgreSQL client
psql -U postgres
CREATE DATABASE library_db;
\q
```

### 6. Run database migrations

```bash
# Initialize Alembic (first time only)
alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

## 🏃 Running the Application

### Development mode

```bash
# Using uvicorn directly
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or using the main.py
python -m app.main
```

The API will be available at:
- **API**: http://localhost:8000
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Production mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 📚 API Endpoints

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/register` | Register new user | No |
| POST | `/login` | Login and get tokens | No |
| POST | `/refresh` | Refresh access token | No |
| GET | `/me` | Get current user info | Yes |

### Books (`/api/v1/books`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/` | Get all books (paginated) | No | - |
| GET | `/{book_id}` | Get book by ID | No | - |
| POST | `/` | Create new book | Yes | Librarian |
| PUT | `/{book_id}` | Update book | Yes | Librarian |
| DELETE | `/{book_id}` | Delete book | Yes | Librarian |
| GET | `/{book_id}/stats` | Get book statistics | No | - |

### Book Copies (`/api/v1/book-copies`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| POST | `/` | Create book copy | Yes | Librarian |
| GET | `/{copy_id}` | Get copy by ID | Yes | Librarian |
| PUT | `/{copy_id}` | Update copy | Yes | Librarian |
| DELETE | `/{copy_id}` | Delete copy | Yes | Librarian |
| POST | `/{copy_id}/borrow` | Borrow a book | Yes | User |
| POST | `/{copy_id}/return` | Return a book | Yes | User |

### News (`/api/v1/news`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/` | Get all news (paginated) | No | - |
| GET | `/{news_id}` | Get news by ID | No | - |
| POST | `/` | Create news | Yes | Librarian |
| PUT | `/{news_id}` | Update news | Yes | Librarian |
| DELETE | `/{news_id}` | Delete news | Yes | Librarian |
| POST | `/{news_id}/publish` | Publish news | Yes | Librarian |

### User Management (`/api/v1/users`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| GET | `/` | Get all users (paginated) | Yes | Admin |
| GET | `/{user_id}` | Get user details with stats | Yes | Admin |
| PUT | `/{user_id}` | Update user info | Yes | Admin |
| DELETE | `/{user_id}` | Deactivate user | Yes | Admin |
| PUT | `/{user_id}/role` | Change user role | Yes | Admin |
| GET | `/{user_id}/borrow-history` | Get user's borrow history | Yes | Admin |

### Reservations (`/api/v1/reservations`)

| Method | Endpoint | Description | Auth Required | Role |
|--------|----------|-------------|---------------|------|
| POST | `/` | Reserve a book | Yes | User |
| GET | `/` | Get user's reservations | Yes | User |
| DELETE | `/{reservation_id}` | Cancel reservation | Yes | User |
| GET | `/book/{book_id}` | Get book's reservation queue | Yes | Librarian |
| POST | `/{reservation_id}/fulfill` | Fulfill reservation | Yes | Librarian |

## 🔐 Authentication

The API uses JWT (JSON Web Tokens) for authentication. To access protected endpoints:

1. **Register** or **Login** to get access and refresh tokens
2. Include the access token in the `Authorization` header:
   ```
   Authorization: Bearer <your_access_token>
   ```
3. When the access token expires, use the refresh token to get a new one

### Example: Login and Access Protected Endpoint

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john_doe",
    "password": "SecurePass123"
  }'

# Response
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer"
}

# Use access token
curl -X GET http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGc..."
```

## 👥 User Roles

- **User**: Can browse books, borrow and return books
- **Librarian**: Can manage books, book copies, and news
- **Admin**: Full access to all resources including user management

## 🗄️ Database Schema

### Main Tables

- `users` - User accounts with authentication
- `books` - Book information
- `authors` - Book authors
- `genres` - Book genres
- `keywords` - Book keywords
- `book_copies` - Physical copies of books
- `borrow_records` - Book borrowing history
- `news` - News articles

### Relationships

- Books have many-to-many relationships with Authors, Genres, and Keywords
- Books have one-to-many relationship with BookCopies
- BookCopies have one-to-many relationship with BorrowRecords
- Users have one-to-many relationship with BorrowRecords

## 🧪 Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_auth.py -v
```

## 📦 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration
│   ├── database.py          # Database setup
│   ├── dependencies.py      # Shared dependencies
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── api/
│   │   └── v1/              # API v1 routes
│   ├── services/            # Business logic
│   └── utils/               # Utility functions
├── alembic/                 # Database migrations
├── tests/                   # Test files
├── uploads/                 # File uploads
├── requirements.txt
├── .env
└── README.md
```

## 🔧 Development

### Code Formatting

```bash
# Format code with black
black app/

# Check code style with flake8
flake8 app/

# Type checking with mypy
mypy app/
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# View migration history
alembic history
```

## 🚢 Deployment

### Using Docker (Coming Soon)

```bash
docker-compose up -d
```

### Manual Deployment

1. Set up PostgreSQL database
2. Configure environment variables
3. Run migrations
4. Start application with production settings

```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start with gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

## 📝 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `SECRET_KEY` | JWT secret key (min 32 chars) | Required |
| `ALGORITHM` | JWT algorithm | HS256 |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token expiry | 15 |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token expiry | 7 |
| `CORS_ORIGINS` | Allowed CORS origins | localhost:5173 |
| `DEBUG` | Debug mode | True |
| `HOST` | Server host | 0.0.0.0 |
| `PORT` | Server port | 8000 |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

Library Online Team

## 🐛 Known Issues

- Statistics endpoints not yet implemented

## 🗺️ Roadmap

- [x] Add file upload for book covers and news images
- [x] Implement user management endpoints
- [x] Implement book reservations
- [ ] Add statistics and dashboard endpoints
- [ ] Add email notifications for overdue books and reservations
- [ ] Add book reviews and ratings
- [ ] Implement full-text search with Elasticsearch
- [ ] Add Docker support
- [ ] Add CI/CD pipeline
- [ ] Add automated reservation expiry job

## 📞 Support

For support, email support@libraryonline.com or open an issue on GitHub.
