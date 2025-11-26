import api from './axios';
import { BorrowRecord, PaginatedResponse } from '../types/models';

export interface LoanStats {
  active_loans: number;
  overdue_loans: number;
}

export const loansApi = {
  getLoans: async (params: { page?: number; page_size?: number; status?: string; search?: string } = {}) => {
    const response = await api.get<PaginatedResponse<BorrowRecord>>('/loans', { params });
    return response.data;
  },
  
  getStats: async () => {
    const response = await api.get<LoanStats>('/loans/stats');
    return response.data;
  }
};
