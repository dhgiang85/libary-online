import api from './axios';

export interface DashboardStats {
  library_stats: {
    total_books: number;
    total_copies: number;
    available_copies: number;
    borrowed_copies: number;
  };
  user_stats: {
    total_users: number;
    new_users_this_month: number;
  };
  borrow_stats: {
    active_borrows: number;
    overdue_count: number;
    pending_pickups: number;
    returned_this_month: number;
  };
  review_stats: {
    total_reviews: number;
    average_rating: number;
  };
}

export interface BorrowTrend {
  date: string;
  count: number;
}

export interface PopularBook {
  id: string;
  title: string;
  cover_url: string | null;
  borrow_count: number;
}

export interface PopularGenre {
  id: string;
  name: string;
  borrow_count: number;
}

export interface ActiveUser {
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  borrow_count: number;
}

export const dashboardApi = {
  /**
   * Get comprehensive dashboard statistics
   */
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },

  /**
   * Get borrow trends for the last N days
   */
  getBorrowTrends: async (days: number = 30): Promise<BorrowTrend[]> => {
    const response = await api.get<BorrowTrend[]>('/dashboard/borrow-trends', {
      params: { days }
    });
    return response.data;
  },

  /**
   * Get most borrowed books
   */
  getPopularBooks: async (limit: number = 10): Promise<PopularBook[]> => {
    const response = await api.get<PopularBook[]>('/dashboard/popular-books', {
      params: { limit }
    });
    return response.data;
  },

  /**
   * Get most popular genres
   */
  getPopularGenres: async (limit: number = 10): Promise<PopularGenre[]> => {
    const response = await api.get<PopularGenre[]>('/dashboard/popular-genres', {
      params: { limit }
    });
    return response.data;
  },

  /**
   * Get most active users
   */
  getActiveUsers: async (limit: number = 10): Promise<ActiveUser[]> => {
    const response = await api.get<ActiveUser[]>('/dashboard/active-users', {
      params: { limit }
    });
    return response.data;
  }
};
