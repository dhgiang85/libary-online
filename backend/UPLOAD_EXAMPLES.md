# Example: Upload Book Cover

## Using cURL

```bash
# Upload book cover
curl -X POST "http://localhost:8000/api/v1/upload/book-cover/{BOOK_ID}" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "file=@/path/to/cover.jpg"
```

## Using Python requests

```python
import requests

# Your auth token
token = "YOUR_ACCESS_TOKEN"
book_id = "your-book-uuid"

# Upload file
with open("cover.jpg", "rb") as f:
    files = {"file": ("cover.jpg", f, "image/jpeg")}
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.post(
        f"http://localhost:8000/api/v1/upload/book-cover/{book_id}",
        files=files,
        headers=headers
    )
    
    print(response.json())
```

## Using JavaScript (Frontend)

```javascript
async function uploadBookCover(bookId, file, accessToken) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(
    `http://localhost:8000/api/v1/upload/book-cover/${bookId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    }
  );
  
  return await response.json();
}

// Usage
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const result = await uploadBookCover('book-uuid', file, 'your-token');
console.log(result);
```

## Using React

```jsx
import { useState } from 'react';

function BookCoverUpload({ bookId, accessToken }) {
  const [uploading, setUploading] = useState(false);
  
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/v1/upload/book-cover/${bookId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`
          },
          body: formData
        }
      );
      
      const data = await response.json();
      console.log('Upload successful:', data);
      
      // Update UI with new cover URL
      // data.cover_url will be something like "/uploads/covers/uuid.jpg"
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div>
      <input 
        type="file" 
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
    </div>
  );
}
```

## Response

Success response (200):
```json
{
  "id": "book-uuid",
  "title": "Book Title",
  "cover_url": "/uploads/covers/abc123-def456.jpg",
  "authors": [...],
  "genres": [...],
  ...
}
```

## Accessing Uploaded Files

After upload, files can be accessed at:
```
http://localhost:8000/uploads/covers/filename.jpg
```

Example in HTML:
```html
<img src="http://localhost:8000/uploads/covers/abc123.jpg" alt="Book Cover">
```

## File Constraints

- **Max size**: 5MB (configurable in .env)
- **Allowed formats**: jpg, jpeg, png, webp
- **Content-Type**: Must be image/*
- **Authentication**: Librarian role required
