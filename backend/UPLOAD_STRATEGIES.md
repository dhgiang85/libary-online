# Upload Strategies for Creating Books

## Strategy Comparison

### ⭐ Strategy 1: Two-Step Process (RECOMMENDED)

**Workflow:**
1. Create book → Get book ID
2. Upload cover → Update book

**Pros:**
- ✅ Simple implementation
- ✅ Clear separation of concerns
- ✅ Easy error handling
- ✅ Can retry upload independently
- ✅ Works with existing endpoints

**Cons:**
- ⚠️ Two API calls required
- ⚠️ Temporary state (book without cover)

**Frontend Example:**
```jsx
const createBookTwoStep = async (bookData, coverFile) => {
  // Step 1: Create book
  const bookResponse = await fetch('/api/v1/books/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bookData)
  });
  
  const book = await bookResponse.json();
  
  // Step 2: Upload cover (if provided)
  if (coverFile) {
    const formData = new FormData();
    formData.append('file', coverFile);
    
    const uploadResponse = await fetch(
      `/api/v1/upload/book-cover/${book.id}`,
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      }
    );
    
    return await uploadResponse.json();
  }
  
  return book;
};
```

---

### 🚀 Strategy 2: Single-Step Multipart (ADVANCED)

**Workflow:** Upload everything in one request

**Pros:**
- ✅ Single API call
- ✅ Atomic operation
- ✅ Better UX (one loading state)

**Cons:**
- ⚠️ More complex implementation
- ⚠️ Harder to debug
- ⚠️ Must send all data as FormData

**Endpoint:** `POST /api/v1/books-with-upload/`

**Frontend Example:**
```jsx
const createBookSingleStep = async (bookData, coverFile) => {
  const formData = new FormData();
  
  // Add text fields
  formData.append('title', bookData.title);
  formData.append('description', bookData.description || '');
  
  // Add arrays as JSON strings
  formData.append('authors', JSON.stringify(bookData.authors));
  formData.append('genres', JSON.stringify(bookData.genres));
  formData.append('keywords', JSON.stringify(bookData.keywords || []));
  
  // Add location
  formData.append('floor', bookData.location.floor);
  formData.append('shelf', bookData.location.shelf);
  formData.append('row', bookData.location.row);
  
  // Add optional fields
  if (bookData.isbn) formData.append('isbn', bookData.isbn);
  if (bookData.publisher) formData.append('publisher', bookData.publisher);
  if (bookData.publication_year) formData.append('publication_year', bookData.publication_year);
  if (bookData.pages) formData.append('pages', bookData.pages);
  
  // Add cover file (optional)
  if (coverFile) {
    formData.append('cover', coverFile);
  }
  
  const response = await fetch('/api/v1/books-with-upload/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // Don't set Content-Type, browser will set it with boundary
    },
    body: formData
  });
  
  return await response.json();
};
```

---

## 📋 Complete React Component Example

### Using Two-Step Strategy

```jsx
import { useState } from 'react';

function CreateBookForm() {
  const [bookData, setBookData] = useState({
    title: '',
    description: '',
    authors: [],
    genres: [],
    keywords: [],
    location: { floor: '', shelf: '', row: '' },
    isbn: '',
    publisher: '',
    publication_year: null,
    pages: null
  });
  
  const [coverFile, setCoverFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Step 1: Create book
      setUploadProgress('Creating book...');
      const bookResponse = await fetch('http://localhost:8000/api/v1/books/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bookData)
      });
      
      if (!bookResponse.ok) {
        throw new Error('Failed to create book');
      }
      
      const book = await bookResponse.json();
      
      // Step 2: Upload cover if selected
      if (coverFile) {
        setUploadProgress('Uploading cover...');
        const formData = new FormData();
        formData.append('file', coverFile);
        
        const uploadResponse = await fetch(
          `http://localhost:8000/api/v1/upload/book-cover/${book.id}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: formData
          }
        );
        
        if (!uploadResponse.ok) {
          console.warn('Cover upload failed, but book was created');
        }
      }
      
      setUploadProgress('Success!');
      alert('Book created successfully!');
      
      // Reset form
      setBookData({
        title: '',
        description: '',
        authors: [],
        genres: [],
        keywords: [],
        location: { floor: '', shelf: '', row: '' },
        isbn: '',
        publisher: '',
        publication_year: null,
        pages: null
      });
      setCoverFile(null);
      
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to create book');
    } finally {
      setLoading(false);
      setUploadProgress('');
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Title"
        value={bookData.title}
        onChange={(e) => setBookData({...bookData, title: e.target.value})}
        required
      />
      
      {/* Other fields... */}
      
      <div>
        <label>Book Cover (optional)</label>
        <input
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={(e) => setCoverFile(e.target.files[0])}
        />
        {coverFile && <p>Selected: {coverFile.name}</p>}
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? uploadProgress : 'Create Book'}
      </button>
    </form>
  );
}
```

---

### Using Single-Step Strategy

```jsx
const handleSubmitSingleStep = async (e) => {
  e.preventDefault();
  setLoading(true);
  
  try {
    const formData = new FormData();
    
    // Add all fields
    formData.append('title', bookData.title);
    formData.append('description', bookData.description);
    formData.append('authors', JSON.stringify(bookData.authors));
    formData.append('genres', JSON.stringify(bookData.genres));
    formData.append('keywords', JSON.stringify(bookData.keywords));
    formData.append('floor', bookData.location.floor);
    formData.append('shelf', bookData.location.shelf);
    formData.append('row', bookData.location.row);
    
    if (bookData.isbn) formData.append('isbn', bookData.isbn);
    if (bookData.publisher) formData.append('publisher', bookData.publisher);
    if (bookData.publication_year) formData.append('publication_year', bookData.publication_year);
    if (bookData.pages) formData.append('pages', bookData.pages);
    
    // Add cover file
    if (coverFile) {
      formData.append('cover', coverFile);
    }
    
    const response = await fetch('http://localhost:8000/api/v1/books-with-upload/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });
    
    if (!response.ok) {
      throw new Error('Failed to create book');
    }
    
    const book = await response.json();
    alert('Book created successfully!');
    
  } catch (error) {
    console.error('Error:', error);
    alert('Failed to create book');
  } finally {
    setLoading(false);
  }
};
```

---

## 🎯 Which Strategy to Choose?

### Use Two-Step if:
- ✅ You want simple, maintainable code
- ✅ Cover upload is optional
- ✅ You need to handle upload failures gracefully
- ✅ You're building an MVP

### Use Single-Step if:
- ✅ You want optimal UX (one request)
- ✅ Cover is required
- ✅ You need atomic operations
- ✅ You have complex form handling

---

## 📊 API Endpoints Summary

| Endpoint | Method | Purpose | Strategy |
|----------|--------|---------|----------|
| `/api/v1/books/` | POST | Create book (no file) | Two-Step (1) |
| `/api/v1/upload/book-cover/{id}` | POST | Upload cover | Two-Step (2) |
| `/api/v1/books-with-upload/` | POST | Create + Upload | Single-Step |

---

## 🔍 Testing with cURL

### Two-Step:
```bash
# Step 1: Create book
curl -X POST http://localhost:8000/api/v1/books/ \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Book",
    "authors": ["Author"],
    "genres": ["Fiction"],
    "location": {"floor": "1", "shelf": "A", "row": "1"}
  }'

# Step 2: Upload cover
curl -X POST http://localhost:8000/api/v1/upload/book-cover/BOOK_ID \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@cover.jpg"
```

### Single-Step:
```bash
curl -X POST http://localhost:8000/api/v1/books-with-upload/ \
  -H "Authorization: Bearer TOKEN" \
  -F "title=Test Book" \
  -F "authors=[\"Author\"]" \
  -F "genres=[\"Fiction\"]" \
  -F "keywords=[]" \
  -F "floor=1" \
  -F "shelf=A" \
  -F "row=1" \
  -F "cover=@cover.jpg"
```

---

## 💡 Recommendation

**Start with Two-Step Strategy** vì:
1. Dễ implement và debug
2. Flexible hơn
3. Có thể upgrade lên Single-Step sau nếu cần
4. Cover upload là optional, không block book creation

Sau khi system stable, có thể add Single-Step endpoint như một alternative option! 🚀
