import api from './axios';
import { User, PaginatedResponse } from '../types/models';

export interface UserDetail extends User {
  total_borrows: number;
  active_borrows: number;
  total_reservations: number;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  full_name?: string;
  phone_number?: string;
  address?: string;
  password?: string;
  is_active?: boolean;
}

export interface RoleUpdateData {
  role: 'user' | 'librarian' | 'admin';
}

export interface BorrowRecord {
  id: string;
  user_id: string;
  book_copy_id: string;
  borrowed_at: string;
  due_date: string;
  returned_at: string | null;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE';
  fine_amount: number;
  fine_paid: boolean;
}

export const usersApi = {
  getUsers: async (params: {
    page?: number;
    page_size?: number;
    role?: 'user' | 'librarian' | 'admin';
    is_active?: boolean;
    search?: string;
  } = {}) => {
    const response = await api.get<PaginatedResponse<User>>('/users', { params });
    return response.data;
  },

  getUserDetail: async (userId: string) => {
    const response = await api.get<UserDetail>(`/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: string, data: UpdateUserData) => {
    const response = await api.put<User>(`/users/${userId}`, data);
    return response.data;
  },

  deactivateUser: async (userId: string) => {
    await api.delete(`/users/${userId}`);
  },

  activateUser: async (userId: string) => {
    const response = await api.put(`/users/${userId}/activate`);
    return response.data;
  },

  updateUserRole: async (userId: string, data: RoleUpdateData) => {
    const response = await api.put<User>(`/users/${userId}/role`, data);
    return response.data;
  },

  getUserBorrowHistory: async (userId: string, params: {
    page?: number;
    page_size?: number;
  } = {}) => {
    const response = await api.get<PaginatedResponse<BorrowRecord>>(`/users/${userId}/borrow-history`, { params });
    return response.data;
  }
};
