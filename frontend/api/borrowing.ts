import api from './axios';

export enum BorrowStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  RETURNED = 'RETURNED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export interface BorrowRecord {
  id: string;
  book_title: string;
  book_cover: string | null;
  book_authors: string[];
  copy_barcode: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
  status: BorrowStatus;
  deposit_fee: number;
  user_full_name?: string;
  user_email?: string;
}

export const borrowingApi = {
  getMyHistory: async (status?: BorrowStatus) => {
    const params = status ? { status } : {};
    const response = await api.get<BorrowRecord[]>('/borrowing/my-history', { params });
    return response.data;
  },

  confirmPickup: async (recordId: string) => {
    const response = await api.post(`/borrowing/${recordId}/confirm-pickup`);
    return response.data;
  },

  returnBook: async (recordId: string) => {
    const response = await api.post(`/borrowing/${recordId}/return`);
    return response.data;
  },

  getAllBorrows: async (params?: { status?: BorrowStatus; search?: string; skip?: number; limit?: number }) => {
    const response = await api.get<BorrowRecord[]>('/borrowing/all', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await api.get<{
      active_borrows: number;
      overdue_books: number;
      pending_pickups: number;
      returned_today: number;
    }>('/borrowing/stats');
    return response.data;
  },
};
