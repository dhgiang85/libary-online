import api from './axios';
import { Book, PaginatedResponse } from '../types/models';

export interface BookFilters {
  page?: number;
  page_size?: number;
  sort?: string;
  search?: string;
  genre?: string;
  authors?: string;
  min_rating?: number;
  only_available?: boolean;
}

export interface CreateBookRequest {
  title: string;
  description: string;
  cover_url?: string;
  isbn?: string;
  publisher?: string;
  publication_year?: number;
  pages?: number;
  deposit_fee?: number;  // Phí đặt cọc (VND)
  floor?: string;
  shelf?: string;
  row?: string;
  author_names: string[];
  genre_ids?: string[];
  keyword_names?: string[];
  initial_copies?: number;
}

export const booksApi = {
  getBooks: async (params: BookFilters = {}) => {
    const response = await api.get<PaginatedResponse<Book>>('/books', { params });
    return response.data;
  },
  
  getBook: async (id: string) => {
    const response = await api.get<Book>(`/books/${id}`);
    return response.data;
  },
  
  createBook: async (data: CreateBookRequest): Promise<Book> => {
    const response = await api.post<Book>('/books/', data);
    return response.data;
  },

  createBookWithUpload: async (data: CreateBookRequest, coverFile?: File): Promise<Book> => {
    const formData = new FormData();
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    formData.append('authors', JSON.stringify(data.author_names));
    formData.append('genres', JSON.stringify(data.genre_ids || []));
    formData.append('keywords', JSON.stringify(data.keyword_names || []));
    
    if (data.floor) formData.append('floor', data.floor);
    if (data.shelf) formData.append('shelf', data.shelf);
    if (data.row) formData.append('row', data.row);
    
    if (data.isbn) formData.append('isbn', data.isbn);
    if (data.publisher) formData.append('publisher', data.publisher);
    if (data.publication_year) formData.append('publication_year', data.publication_year.toString());
    if (data.pages) formData.append('pages', data.pages.toString());
    if (data.deposit_fee !== undefined) formData.append('deposit_fee', data.deposit_fee.toString());
    if (data.initial_copies) formData.append('initial_copies', data.initial_copies.toString());
    
    if (coverFile) {
      formData.append('cover', coverFile);
    }

    const response = await api.post<Book>('/books-with-upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateBookWithUpload: async (id: string, data: CreateBookRequest, coverFile?: File): Promise<Book> => {
    const formData = new FormData();
    if (data.title) formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    
    if (data.author_names) formData.append('authors', JSON.stringify(data.author_names));
    if (data.genre_ids) formData.append('genres', JSON.stringify(data.genre_ids));
    if (data.keyword_names) formData.append('keywords', JSON.stringify(data.keyword_names));
    
    if (data.floor) formData.append('floor', data.floor);
    if (data.shelf) formData.append('shelf', data.shelf);
    if (data.row) formData.append('row', data.row);
    
    if (data.isbn) formData.append('isbn', data.isbn);
    if (data.publisher) formData.append('publisher', data.publisher);
    if (data.publication_year) formData.append('publication_year', data.publication_year.toString());
    if (data.pages) formData.append('pages', data.pages.toString());
    if (data.deposit_fee !== undefined) formData.append('deposit_fee', data.deposit_fee.toString());
    
    if (coverFile) {
      formData.append('cover', coverFile);
    }

    const response = await api.put<Book>(`/books-with-upload/${id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  updateBook: async (id: string, data: Partial<CreateBookRequest>) => {
    const response = await api.put<Book>(`/books/${id}`, data);
    return response.data;
  },
  
  deleteBook: async (id: string) => {
    await api.delete(`/books/${id}`);
  },
  
  getStats: async (id: string) => {
    const response = await api.get(`/books/${id}/stats`);
    return response.data;
  }
};
