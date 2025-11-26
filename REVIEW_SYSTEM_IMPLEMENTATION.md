# Review System Implementation - Book Detail Page

## ✅ Đã hoàn thành

Đã implement đầy đủ tính năng đánh giá sách trong trang chi tiết sách (BookDetail).

## Tính năng

### 1. **Rating Statistics (Thống kê đánh giá)**

Hiển thị tổng quan về đánh giá của sách:

```
┌─────────────────────────────────────────────┐
│  Rating Statistics                          │
│  ┌─────────┐  ┌──────────────────────────┐ │
│  │  4.5    │  │ 5 ⭐ ████████████░░ 8    │ │
│  │  ⭐⭐⭐⭐⭐ │  │ 4 ⭐ ████████░░░░░ 5    │ │
│  │ 15 đánh │  │ 3 ⭐ ████░░░░░░░░ 2    │ │
│  │  giá    │  │ 2 ⭐ ░░░░░░░░░░░░ 0    │ │
│  └─────────┘  │ 1 ⭐ ░░░░░░░░░░░░ 0    │ │
│               └──────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Features**:
- Hiển thị average rating lớn với số sao
- Distribution bars cho từng mức rating (1-5 sao)
- Tổng số đánh giá
- Progress bar màu vàng cho mỗi rating level
- Responsive design (stack vertical trên mobile)

### 2. **Write Review (Viết đánh giá)**

Button/Form để user viết đánh giá mới:

```
┌────────────────────────────────────────┐
│  ⭐ Viết đánh giá của bạn              │
│  (Dashed border button)                │
└────────────────────────────────────────┘
        ↓ Click
┌────────────────────────────────────────┐
│  Đánh giá của bạn                      │
│  ⭐ ⭐ ⭐ ⭐ ⭐ (Interactive stars)      │
│                                        │
│  Nhận xét (Tùy chọn)                   │
│  ┌──────────────────────────────────┐ │
│  │ Chia sẻ cảm nghĩ...              │ │
│  │                                   │ │
│  └──────────────────────────────────┘ │
│                                        │
│           [Hủy]  [Gửi đánh giá]       │
└────────────────────────────────────────┘
```

**Logic**:
- ✅ Chỉ hiển thị khi user đã đăng nhập
- ✅ User chỉ được review 1 lần mỗi sách
- ✅ Nếu đã review → button biến mất
- ✅ Backend check: user phải đã mượn sách mới được review
- ✅ Interactive star rating (hover + click)
- ✅ Optional review text (max 2000 chars)

### 3. **Review List (Danh sách đánh giá)**

Hiển thị tất cả reviews từ users:

```
┌─────────────────────────────────────────────┐
│  Tất cả đánh giá (15)                       │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ 👤 Nguyễn Văn An                     │  │
│  │    ⭐⭐⭐⭐⭐  3 ngày trước         ...│  │
│  │    Cuốn sách rất hay, tôi rất thích! │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌──────────────────────────────────────┐  │
│  │ 👤 Trần Thị Bình                     │  │
│  │    ⭐⭐⭐⭐☆  1 tuần trước          ...│  │
│  │    Nội dung tốt nhưng hơi dài.       │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**Features**:
- Avatar với chữ cái đầu tên
- Username hoặc Full name
- Star rating display
- Timestamp (relative time với date-fns)
- Review text (nếu có)
- Three-dot menu cho own reviews:
  - ✏️ Sửa (Edit inline)
  - 🗑️ Xóa (With confirmation)

### 4. **Edit Review (Sửa đánh giá)**

Inline edit form khi user click "Sửa":

```
Original Review Card
        ↓ Click "Sửa"
┌────────────────────────────────────────┐
│  Đánh giá của bạn                      │
│  ⭐ ⭐ ⭐ ⭐ ☆ (Filled with current)   │
│                                        │
│  Nhận xét (Tùy chọn)                   │
│  ┌──────────────────────────────────┐ │
│  │ Cuốn sách rất hay...              │ │
│  │ (Pre-filled)                      │ │
│  └──────────────────────────────────┘ │
│                                        │
│           [Hủy]  [Cập nhật]           │
└────────────────────────────────────────┘
```

### 5. **Authentication States**

```
┌─────────────────────────────────────────┐
│  Not Logged In:                         │
│  ┌───────────────────────────────────┐  │
│  │ Vui lòng đăng nhập để viết đánh  │  │
│  │ giá                                │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Logged In + Already Reviewed:          │
│  (No write button, only see own review) │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Logged In + Not Reviewed:              │
│  ⭐ Viết đánh giá của bạn               │
└─────────────────────────────────────────┘
```

## Backend API Endpoints

### 1. **Create Review**
```
POST /api/v1/books/{book_id}/reviews
Body: { rating: 5, review_text: "Great book!" }
```

**Validations**:
- ✅ User must be authenticated
- ✅ User must have borrowed the book before
- ✅ User can only review once per book
- ✅ Rating must be 1-5
- ✅ Review text max 2000 chars

### 2. **Get Reviews**
```
GET /api/v1/books/{book_id}/reviews?page=1&page_size=10&sort_by=newest
```

**Sort options**: newest, oldest, highest, lowest

**Response includes**:
- User info (username, full_name)
- Pagination metadata

### 3. **Update Review**
```
PUT /api/v1/reviews/{review_id}
Body: { rating: 4, review_text: "Updated review" }
```

**Validations**:
- ✅ User can only update own reviews

### 4. **Delete Review**
```
DELETE /api/v1/reviews/{review_id}
```

**Validations**:
- ✅ User can only delete own reviews

### 5. **Get Rating Stats**
```
GET /api/v1/reviews/books/{book_id}/rating-stats
```

**Response**:
```json
{
  "average_rating": 4.5,
  "total_reviews": 15,
  "rating_distribution": {
    "1": 0,
    "2": 0,
    "3": 2,
    "4": 5,
    "5": 8
  }
}
```

## Files Changed/Created

### Frontend

#### Updated:
**`frontend/components/reviews/ReviewList.tsx`** (Major changes):
- Added rating statistics display with distribution bars
- Added "Write Review" button/form section
- Added authentication state handling
- Added check for existing user review
- Improved UI layout and styling
- Added query for rating stats

**Features implemented**:
```typescript
// Check if user already reviewed
const userReview = reviews?.items.find(r => r.user_id === user?.id);
const canWriteReview = isAuthenticated && !userReview;

// Rating stats query
const { data: stats } = useQuery({
  queryKey: ['review-stats', bookId],
  queryFn: () => reviewsApi.getRatingStats(bookId),
});
```

#### Existing (Already working):
- `frontend/components/reviews/ReviewForm.tsx` - Form for create/edit
- `frontend/components/reviews/RatingStars.tsx` - Star rating component
- `frontend/api/reviews.ts` - API client
- `frontend/components/BookDetail.tsx` - Uses ReviewList

### Backend

#### Existing (Already working):
- `backend/app/api/v1/reviews.py` - All CRUD endpoints
- `backend/app/models/review.py` - Review model with constraints
- `backend/app/schemas/review.py` - Request/response schemas
- `backend/app/utils/rating_calculator.py` - Rating calculations

## UI Components

### Rating Statistics Section

```typescript
<div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6">
  {/* Average Rating - Left side */}
  <div className="text-5xl font-bold">4.5</div>
  <RatingStars rating={4.5} size={20} />
  <p>15 đánh giá</p>

  {/* Distribution - Right side */}
  {[5, 4, 3, 2, 1].map(star => (
    <div className="flex items-center gap-3">
      <span>{star} ⭐</span>
      <div className="progress-bar">
        <div style={{ width: `${percentage}%` }} />
      </div>
      <span>{count}</span>
    </div>
  ))}
</div>
```

### Write Review Button

```typescript
{canWriteReview && !showReviewForm && (
  <button
    onClick={() => setShowReviewForm(true)}
    className="w-full py-4 border-2 border-dashed hover:border-primary"
  >
    ⭐ Viết đánh giá của bạn
  </button>
)}

{showReviewForm && (
  <ReviewForm
    bookId={bookId}
    onSuccess={() => setShowReviewForm(false)}
    onCancel={() => setShowReviewForm(false)}
  />
)}
```

### Review Card

```typescript
<div className="border-b pb-6">
  {/* Header: Avatar + Name + Rating + Time */}
  <div className="flex justify-between">
    <div className="flex items-center gap-3">
      <div className="avatar">
        {review.user_full_name[0].toUpperCase()}
      </div>
      <div>
        <p className="font-bold">{review.user_full_name}</p>
        <RatingStars rating={review.rating} size={14} />
        <span>{formatDistanceToNow(review.created_at)}</span>
      </div>
    </div>

    {/* Three-dot menu for own reviews */}
    {user?.id === review.user_id && (
      <button>⋮</button>
    )}
  </div>

  {/* Review text */}
  {review.review_text && (
    <p>{review.review_text}</p>
  )}
</div>
```

## Database Schema

### Review Model

```python
class Review(Base):
    __tablename__ = 'reviews'

    id = Column(GUID(), primary_key=True)
    user_id = Column(GUID(), ForeignKey('users.id'), nullable=False)
    book_id = Column(GUID(), ForeignKey('books.id'), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    review_text = Column(Text, nullable=True)
    created_at = Column(DateTime)
    updated_at = Column(DateTime)

    __table_args__ = (
        CheckConstraint('rating >= 1 AND rating <= 5'),
        UniqueConstraint('user_id', 'book_id'),  # One review per user per book
    )
```

### Book Model Updates

```python
class Book(Base):
    # ... existing fields ...

    # Cached rating fields
    average_rating = Column(Integer, nullable=True)  # Cached, updated on review changes
    total_reviews = Column(Integer, default=0)

    # Relationships
    reviews = relationship('Review', back_populates='book', cascade='all, delete-orphan')
```

## User Flow

### 1. View Reviews (Public)

```
User visits /books/{book_id}
    ↓
Selects "Đánh giá" tab
    ↓
See rating statistics + all reviews
```

### 2. Write Review (Authenticated + Borrowed Book)

```
User logged in
    ↓
Has borrowed the book before
    ↓
Hasn't reviewed yet
    ↓
Click "Viết đánh giá của bạn"
    ↓
Select stars (1-5) + Write text
    ↓
Click "Gửi đánh giá"
    ↓
Review created + Book rating updated
    ↓
Review appears in list
```

### 3. Edit Review

```
User sees own review in list
    ↓
Click three-dot menu → "Sửa"
    ↓
Review card becomes edit form
    ↓
Change rating/text
    ↓
Click "Cập nhật"
    ↓
Review updated + Book rating recalculated
```

### 4. Delete Review

```
User sees own review in list
    ↓
Click three-dot menu → "Xóa"
    ↓
Confirm deletion
    ↓
Review deleted + Book rating recalculated
```

## Backend Business Logic

### Rating Calculator

**Update book rating after any review change**:

```python
async def update_book_rating(db: AsyncSession, book_id: UUID):
    # Calculate new average
    avg_rating = await calculate_average_rating(db, book_id)

    # Count total reviews
    total_reviews = await count_reviews(db, book_id)

    # Update book
    book.average_rating = int(round(avg_rating))
    book.total_reviews = total_reviews
    await db.commit()
```

**Get distribution**:

```python
async def get_rating_distribution(db: AsyncSession, book_id: UUID):
    distribution = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}

    for rating in range(1, 6):
        count = await db.execute(
            select(func.count())
            .where(Review.book_id == book_id)
            .where(Review.rating == rating)
        )
        distribution[str(rating)] = count.scalar()

    return distribution
```

## Testing

### 1. Start servers

```bash
# Backend
cd backend
uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev
```

### 2. Test flow

**Setup**:
1. Login as a member user
2. Navigate to a book detail page
3. Click "Đánh giá" tab

**Test Write Review**:
1. ✅ If not logged in → See "Vui lòng đăng nhập"
2. ✅ If logged in but not borrowed → Backend returns 400 error
3. ✅ If logged in + borrowed → See "Viết đánh giá của bạn" button
4. ✅ Click button → Form appears
5. ✅ Select stars (hover effect works)
6. ✅ Write review text
7. ✅ Click "Gửi đánh giá"
8. ✅ Success toast + Review appears in list
9. ✅ Button disappears (already reviewed)
10. ✅ Rating stats update

**Test Edit Review**:
1. ✅ Find your review in list
2. ✅ See three-dot menu (only on own review)
3. ✅ Click "Sửa"
4. ✅ Inline form appears with current data
5. ✅ Change rating/text
6. ✅ Click "Cập nhật"
7. ✅ Review updates + Rating stats recalculate

**Test Delete Review**:
1. ✅ Click three-dot menu → "Xóa"
2. ✅ Confirm dialog appears
3. ✅ Click OK
4. ✅ Review removed from list
5. ✅ "Viết đánh giá" button reappears
6. ✅ Rating stats update

**Test Rating Stats**:
1. ✅ Average rating displayed correctly
2. ✅ Total reviews count correct
3. ✅ Distribution bars show correct percentages
4. ✅ Each star level shows correct count
5. ✅ Stats update when reviews change

## Edge Cases Handled

1. **User not borrowed book**: Backend returns 400 error with message
2. **User already reviewed**: Button hidden, review shown in list
3. **Delete confirmation**: Prevent accidental deletion
4. **Optimistic UI**: Invalidate queries after mutations
5. **Loading states**: Skeleton loaders while fetching
6. **Empty state**: Message when no reviews yet
7. **Not authenticated**: Show login prompt
8. **Dark mode**: All components support dark mode
9. **Responsive**: Works on mobile and desktop

## Benefits

1. **User engagement**: Users can share opinions
2. **Social proof**: New users see ratings before borrowing
3. **Book quality**: Librarians see which books are well-received
4. **Trust**: Only users who borrowed can review (verified reviews)
5. **One review per user**: Prevents spam
6. **Real-time stats**: Cached ratings for performance
7. **Rich UI**: Distribution bars show rating breakdown
8. **Full CRUD**: Users can create, read, update, delete their reviews

## Future Enhancements (Optional)

1. **Sort/Filter reviews**: By rating, date, helpfulness
2. **Helpful votes**: Users can mark reviews as helpful
3. **Report reviews**: Flag inappropriate content
4. **Review images**: Upload photos with reviews
5. **Verified badge**: Show icon for users who returned the book
6. **Review replies**: Librarians can respond to reviews
7. **Email notifications**: Notify user when someone replies
8. **Review guidelines**: Modal with rules before writing
9. **Character counter**: Show remaining chars (2000 max)
10. **Pagination**: Load more reviews instead of all at once

## Summary

✅ **Fully functional review system** with:
- Rating statistics with distribution visualization
- Write/Edit/Delete reviews (authenticated only)
- One review per user per book constraint
- Only borrowed users can review
- Real-time book rating updates
- Beautiful UI with dark mode support
- Mobile responsive design
- Inline editing
- Optimistic updates
- Loading states
- Empty states
- Error handling
