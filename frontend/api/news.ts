import api from './axios';
import { News, NewsCategory, PaginatedResponse } from '../types/models';

export interface CreateNewsData {
  title: string;
  content: string;
  summary?: string;
  cover_image?: string;
  category: NewsCategory;
  published: boolean;
  published_at?: string;
}

export interface UpdateNewsData {
  title?: string;
  content?: string;
  summary?: string;
  cover_image?: string;
  category?: NewsCategory;
  published?: boolean;
  published_at?: string;
}

export const newsApi = {
  getNews: async (params: { page?: number; page_size?: number; published_only?: boolean } = {}) => {
    const response = await api.get<PaginatedResponse<News>>('/news', { params });
    return response.data;
  },

  getNewsDetail: async (id: string) => {
    const response = await api.get<News>(`/news/${id}`);
    return response.data;
  },

  createNews: async (data: CreateNewsData) => {
    const response = await api.post<News>('/news', data);
    return response.data;
  },

  updateNews: async (id: string, data: UpdateNewsData) => {
    const response = await api.put<News>(`/news/${id}`, data);
    return response.data;
  },

  deleteNews: async (id: string) => {
    await api.delete(`/news/${id}`);
  },

  publishNews: async (id: string) => {
    const response = await api.post<News>(`/news/${id}/publish`);
    return response.data;
  }
};
