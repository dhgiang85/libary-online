import api from './axios';
import { PaginatedResponse } from '../types/models';

export interface Genre {
  id: string;
  name: string;
  created_at: string;
}

export interface GenreCreate {
  name: string;
}

export interface GenreUpdate {
  name: string;
}

export interface GenreResponse extends Genre {
  // Additional fields can be added here if backend provides more data
}

export const genresApi = {
  /**
   * Get paginated list of genres with optional search
   */
  getGenres: async (params: {
    page?: number;
    page_size?: number;
    search?: string;
  } = {}): Promise<PaginatedResponse<Genre>> => {
    const response = await api.get<PaginatedResponse<Genre>>('/genres', { params });
    return response.data;
  },

  /**
   * Get all genres without pagination (for dropdowns/selects)
   */
  getAllGenres: async (): Promise<Genre[]> => {
    const response = await api.get<Genre[]>('/genres/all');
    return response.data;
  },

  /**
   * Get a single genre by ID
   */
  getGenre: async (id: string): Promise<Genre> => {
    const response = await api.get<Genre>(`/genres/${id}`);
    return response.data;
  },

  /**
   * Create a new genre (librarian only)
   */
  createGenre: async (data: GenreCreate): Promise<Genre> => {
    const response = await api.post<Genre>('/genres/', data);
    return response.data;
  },

  /**
   * Update an existing genre (librarian only)
   */
  updateGenre: async (id: string, data: GenreUpdate): Promise<Genre> => {
    const response = await api.put<Genre>(`/genres/${id}`, data);
    return response.data;
  },

  /**
   * Delete a genre (librarian only)
   */
  deleteGenre: async (id: string): Promise<void> => {
    await api.delete(`/genres/${id}`);
  },

  /**
   * Get books by genre ID
   */
  getGenreBooks: async (id: string, params: {
    page?: number;
    page_size?: number;
  } = {}): Promise<any> => {
    const response = await api.get(`/genres/${id}/books`, { params });
    return response.data;
  },

  /**
   * Search genres by name
   */
  searchGenres: async (query: string): Promise<Genre[]> => {
    const response = await api.get<PaginatedResponse<Genre>>('/genres', {
      params: { search: query, page_size: 100 }
    });
    return response.data.items;
  }
};
