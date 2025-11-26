import api from './axios';
import { Book, PaginatedResponse } from '../types/models';

export interface SearchFilters {
  q?: string;  // Search query
  genres?: string;  // Comma-separated genre names
  authors?: string;  // Comma-separated author names
  min_rating?: number;  // Minimum rating (1-5)
  max_rating?: number;  // Maximum rating (1-5)
  year_from?: number;  // Publication year from
  year_to?: number;  // Publication year to
  page?: number;
  page_size?: number;
}

export interface SearchResponse extends PaginatedResponse<Book> {
  // Additional search metadata can be added here if needed
}

export const searchApi = {
  /**
   * Advanced search for books with Elasticsearch support
   * Falls back to database search if Elasticsearch is unavailable
   */
  searchBooks: async (filters: SearchFilters = {}): Promise<SearchResponse> => {
    const response = await api.get<SearchResponse>('/search/books', {
      params: filters
    });
    return response.data;
  },

  /**
   * Quick search - convenience method for simple text queries
   */
  quickSearch: async (query: string, page: number = 1, pageSize: number = 20): Promise<SearchResponse> => {
    return searchApi.searchBooks({
      q: query,
      page,
      page_size: pageSize
    });
  },

  /**
   * Search by genre
   */
  searchByGenre: async (genreName: string, page: number = 1): Promise<SearchResponse> => {
    return searchApi.searchBooks({
      genres: genreName,
      page
    });
  },

  /**
   * Search by author
   */
  searchByAuthor: async (authorName: string, page: number = 1): Promise<SearchResponse> => {
    return searchApi.searchBooks({
      authors: authorName,
      page
    });
  },

  /**
   * Search with rating filter
   */
  searchByRating: async (minRating: number, maxRating?: number, page: number = 1): Promise<SearchResponse> => {
    return searchApi.searchBooks({
      min_rating: minRating,
      max_rating: maxRating,
      page
    });
  },

  /**
   * Search by publication year range
   */
  searchByYear: async (yearFrom: number, yearTo?: number, page: number = 1): Promise<SearchResponse> => {
    return searchApi.searchBooks({
      year_from: yearFrom,
      year_to: yearTo,
      page
    });
  },

  /**
   * Advanced search with multiple filters
   */
  advancedSearch: async (
    query: string,
    options: {
      genres?: string[];
      authors?: string[];
      minRating?: number;
      maxRating?: number;
      yearFrom?: number;
      yearTo?: number;
      page?: number;
      pageSize?: number;
    }
  ): Promise<SearchResponse> => {
    return searchApi.searchBooks({
      q: query,
      genres: options.genres?.join(','),
      authors: options.authors?.join(','),
      min_rating: options.minRating,
      max_rating: options.maxRating,
      year_from: options.yearFrom,
      year_to: options.yearTo,
      page: options.page || 1,
      page_size: options.pageSize || 20
    });
  }
};
