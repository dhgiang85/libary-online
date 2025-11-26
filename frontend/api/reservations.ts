import api from './axios';
import { Reservation } from '../types/models';

export const reservationsApi = {
  createReservation: async (bookId: string) => {
    const response = await api.post<Reservation>('/reservations', { book_id: bookId });
    return response.data;
  },
  
  getMyReservations: async () => {
    const response = await api.get<Reservation[]>('/reservations');
    return response.data;
  },
  
  cancelReservation: async (id: string) => {
    await api.delete(`/reservations/${id}`);
  }
};
