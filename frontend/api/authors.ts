import api from './axios';
import { PaginatedResponse } from '../types/models';

export interface Author {
  id: string;
  name: string;
  bio?: string;
  created_at: string;
}

export interface AuthorDetail extends Author {
  book_count: number;
}

export interface Book {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  isbn?: string;
  publisher?: string;
  publication_year?: number;
  pages?: number;
  average_rating?: number;
  total_reviews?: number;
  authors?: Author[];
  genres?: any[];
  keywords?: any[];
}

export interface CreateAuthorData {
  name: string;
  bio?: string;
}

export interface UpdateAuthorData {
  name?: string;
  bio?: string;
}

export const authorsApi = {
  getAuthors: async (params: { page?: number; page_size?: number; search?: string } = {}): Promise<AuthorDetail[]> => {
    const response = await api.get<AuthorDetail[]>('/authors', { params });
    return response.data;
  },

  getAuthor: async (id: string): Promise<AuthorDetail> => {
    const response = await api.get<AuthorDetail>(`/authors/${id}`);
    return response.data;
  },

  createAuthor: async (data: CreateAuthorData): Promise<Author> => {
    const response = await api.post<Author>('/authors', null, { params: data });
    return response.data;
  },

  updateAuthor: async (id: string, data: UpdateAuthorData): Promise<Author> => {
    const response = await api.put<Author>(`/authors/${id}`, null, { params: data });
    return response.data;
  },

  deleteAuthor: async (id: string): Promise<void> => {
    await api.delete(`/authors/${id}`);
  },

  getAuthorBooks: async (id: string, params: { page?: number; page_size?: number } = {}): Promise<PaginatedResponse<Book>> => {
    const response = await api.get<PaginatedResponse<Book>>(`/authors/${id}/books`, { params });
    return response.data;
  },

  getRecentAuthors: async (limit: number = 6): Promise<AuthorDetail[]> => {
    const response = await api.get<AuthorDetail[]>('/authors/recent', { params: { limit } });
    return response.data;
  },
};
