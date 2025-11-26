# Fix: Review API Routes 404 Error

## Vấn đề

Khi gọi API reviews từ frontend, backend trả về lỗi 404:

```
GET  /api/v1/books/{book_id}/reviews → 404 Not Found
POST /api/v1/books/{book_id}/reviews → 404 Not Found
```

## Nguyên nhân

**Backend router có prefix="/reviews"**:

```python
# backend/app/api/v1/reviews.py
router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.post("/books/{book_id}/reviews", ...)
```

Điều này tạo ra endpoint: `/api/v1/reviews/books/{book_id}/reviews` ❌ (Không đúng)

**Frontend gọi**:
```typescript
api.get(`/books/${bookId}/reviews`)  // → /api/v1/books/{book_id}/reviews
```

→ **Mismatch**: Frontend gọi `/books/{id}/reviews` nhưng backend expect `/reviews/books/{id}/reviews`

## Giải pháp

### 1. Bỏ prefix khỏi backend router

**File**: `backend/app/api/v1/reviews.py`

**Before**:
```python
router = APIRouter(prefix="/reviews", tags=["Reviews"])

@router.post("/books/{book_id}/reviews", response_model=ReviewResponse)
@router.get("/books/{book_id}/reviews", response_model=ReviewListResponse)
@router.put("/{review_id}", response_model=ReviewResponse)
@router.delete("/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.get("/books/{book_id}/rating-stats", response_model=BookRatingStats)
```

**After**:
```python
router = APIRouter(tags=["Reviews"])

@router.post("/books/{book_id}/reviews", response_model=ReviewResponse)
@router.get("/books/{book_id}/reviews", response_model=ReviewListResponse)
@router.put("/reviews/{review_id}", response_model=ReviewResponse)
@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
@router.get("/books/{book_id}/rating-stats", response_model=BookRatingStats)
```

### 2. Fix frontend API client

**File**: `frontend/api/reviews.ts`

**Before**:
```typescript
getRatingStats: async (bookId: string) => {
  const response = await api.get<ReviewStats>(`/reviews/books/${bookId}/rating-stats`);
  return response.data;
}
```

**After**:
```typescript
getRatingStats: async (bookId: string) => {
  const response = await api.get<ReviewStats>(`/books/${bookId}/rating-stats`);
  return response.data;
}
```

**Also fixed**:
- Changed `sort?: string` to `sort_by?: string` để match với backend parameter
- Changed `rating: number` to `rating?: number` trong updateReview để match với ReviewUpdate schema

## Endpoints sau khi fix

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/books/{book_id}/reviews` | Create review |
| GET | `/api/v1/books/{book_id}/reviews` | Get book reviews |
| PUT | `/api/v1/reviews/{review_id}` | Update review |
| DELETE | `/api/v1/reviews/{review_id}` | Delete review |
| GET | `/api/v1/books/{book_id}/rating-stats` | Get rating statistics |
| GET | `/api/v1/my-reviews` | Get current user's reviews |

## Testing

### 1. Restart backend server

```bash
cd backend
uvicorn app.main:app --reload
```

### 2. Test trong browser

1. Navigate to book detail page
2. Click "Đánh giá" tab
3. ✅ Rating statistics should load (no 404)
4. ✅ Reviews list should load (no 404)
5. Click "Viết đánh giá của bạn"
6. Submit a review
7. ✅ Review created successfully (no 404)
8. Click edit/delete on your review
9. ✅ Update/delete works (no 404)

### 3. Check browser console

```
✅ GET  /api/v1/books/{book_id}/reviews → 200 OK
✅ GET  /api/v1/books/{book_id}/rating-stats → 200 OK
✅ POST /api/v1/books/{book_id}/reviews → 201 Created
✅ PUT  /api/v1/reviews/{review_id} → 200 OK
✅ DELETE /api/v1/reviews/{review_id} → 204 No Content
```

## Files Changed

### Backend
- `backend/app/api/v1/reviews.py` - Removed `prefix="/reviews"` from router

### Frontend
- `frontend/api/reviews.ts` - Fixed `getRatingStats` path and parameter names

## Why This Solution?

### Option 1: Bỏ prefix (✅ Chosen)
```python
router = APIRouter(tags=["Reviews"])
@router.post("/books/{book_id}/reviews")
```
→ Endpoint: `/api/v1/books/{book_id}/reviews` ✅

**Pros**:
- Cleaner URLs
- More RESTful (resources are nested)
- `/books/{id}/reviews` makes semantic sense

**Cons**:
- None

### Option 2: Giữ prefix + sửa frontend (❌ Rejected)
```python
router = APIRouter(prefix="/reviews", tags=["Reviews"])
@router.post("/books/{book_id}")  # Changed path
```
→ Endpoint: `/api/v1/reviews/books/{book_id}` ❌

**Pros**:
- All review routes start with `/reviews`

**Cons**:
- Less RESTful
- Confusing nested structure
- Not conventional

## RESTful Best Practices

Khi thiết kế nested resources, follow pattern:

```
GET    /books/{book_id}/reviews          # Get all reviews for book
POST   /books/{book_id}/reviews          # Create review for book
GET    /reviews/{review_id}              # Get single review
PUT    /reviews/{review_id}              # Update review
DELETE /reviews/{review_id}              # Delete review
```

**Why?**
- Reviews belong to books → nest under `/books/{id}`
- Individual review operations → use `/reviews/{id}`
- Clear hierarchy and ownership

## Summary

✅ **Fixed 404 errors** bằng cách:
1. Bỏ `prefix="/reviews"` khỏi backend router
2. Sửa `getRatingStats` path trong frontend
3. Sửa parameter names để match với backend

✅ **Endpoints now RESTful** và dễ hiểu:
- `/books/{id}/reviews` - Reviews của một sách
- `/reviews/{id}` - Thao tác trên một review cụ thể
- `/books/{id}/rating-stats` - Thống kê rating của sách

✅ **Build successful** - Frontend build không có errors
