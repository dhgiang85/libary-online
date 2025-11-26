import api from './axios';
import { Review, PaginatedResponse } from '../types/models';

export interface ReviewStats {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<number, number>;
}

export const reviewsApi = {
  getBookReviews: async (bookId: string, params: { page?: number; page_size?: number; sort_by?: string } = {}) => {
    const response = await api.get<PaginatedResponse<Review>>(`/books/${bookId}/reviews`, { params });
    return response.data;
  },

  createReview: async (bookId: string, data: { rating: number; review_text?: string }) => {
    const response = await api.post<Review>(`/books/${bookId}/reviews`, data);
    return response.data;
  },

  updateReview: async (id: string, data: { rating?: number; review_text?: string }) => {
    const response = await api.put<Review>(`/reviews/${id}`, data);
    return response.data;
  },

  deleteReview: async (id: string) => {
    await api.delete(`/reviews/${id}`);
  },

  getRatingStats: async (bookId: string) => {
    const response = await api.get<ReviewStats>(`/books/${bookId}/rating-stats`);
    return response.data;
  }
};
