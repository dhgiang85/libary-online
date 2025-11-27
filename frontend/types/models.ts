export interface Author {
  id: string;
  name: string;
  bio?: string;
}

export interface Genre {
  id: string;
  name: string;
  description?: string;
}

export interface Keyword {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role: 'user' | 'librarian' | 'admin';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Location {
  floor: string;
  shelf: string;
  row: string;
}

export interface Book {
  id: string;
  title: string;
  description: string;
  cover_url?: string;
  isbn?: string;
  publisher?: string;
  publication_year?: number;
  pages?: number;
  location: Location;
  average_rating?: number;
  total_reviews: number;
  total_copies?: number;
  available_copies?: number;
  authors: Author[];
  genres: Genre[];
  keywords: Keyword[];
  created_at: string;
  updated_at: string;
}

export enum CopyStatus {
  AVAILABLE = 'AVAILABLE',
  BORROWED = 'BORROWED',
  LOST = 'LOST'
}

export interface BookCopy {
  id: string;
  book_id: string;
  barcode: string;
  status: CopyStatus | 'AVAILABLE' | 'BORROWED' | 'LOST';
  created_at: string;
  updated_at: string;
}

export enum BorrowStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED'
}

export interface BorrowRecord {
  id: string;
  copy_id: string;
  user_id: string;
  borrowed_at: string;
  due_date: string;
  returned_at?: string;
  status: BorrowStatus | 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  book?: Book;
  copy?: BookCopy;
  user?: User; // Added user field as we are now populating it
}

export interface Reservation {
  id: string;
  user_id: string;
  book_id: string;
  status: 'PENDING' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';
  reserved_at: string;
  expires_at: string;
  fulfilled_at?: string;
  book?: Book;
}

export interface Review {
  id: string;
  user_id: string;
  book_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
  updated_at: string;
  user_username?: string;
  user_full_name?: string;
}

export enum NewsCategory {
  EVENT = 'EVENT',
  MAINTENANCE = 'MAINTENANCE',
  GENERAL = 'GENERAL',
}

export interface News {
  id: string;
  title: string;
  content: string;
  summary?: string;
  cover_image?: string;
  category: NewsCategory;
  author_id: string;
  published: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
