import api from './axios';
import { User } from '../store/authStore';

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
  full_name?: string;
}

export const authApi = {
  login: async (username: string, password: string) => {
    // Send JSON data to match backend LoginRequest schema
    const response = await api.post<Omit<LoginResponse, 'user'>>('/auth/login', {
      username,
      password
    });
    
    // Fetch user info after successful login
    const userResponse = await api.get<User>('/auth/me', {
      headers: {
        Authorization: `Bearer ${response.data.access_token}`
      }
    });
    
    return {
      ...response.data,
      user: userResponse.data
    };
  },
  
  register: async (data: RegisterData) => {
    const response = await api.post<User>('/auth/register', data);
    return response.data;
  },
  
  getCurrentUser: async () => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },
};
