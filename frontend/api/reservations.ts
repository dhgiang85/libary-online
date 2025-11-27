import api from "./axios";
import { Reservation, PaginatedResponse } from "../types/models";

export interface ReservationFilters {
  page?: number;
  page_size?: number;
  status_filter?: "PENDING" | "FULFILLED" | "CANCELLED" | "EXPIRED";
}

export const reservationsApi = {
  /**
   * Create a new reservation for a book
   */
  createReservation: async (bookId: string): Promise<Reservation> => {
    const response = await api.post<Reservation>("/reservations", { book_id: bookId });
    return response.data;
  },

  /**
   * Get current user's reservations with pagination
   */
  getMyReservations: async (filters: ReservationFilters = {}): Promise<PaginatedResponse<Reservation>> => {
    const response = await api.get<PaginatedResponse<Reservation>>("/reservations", {
      params: filters
    });
    return response.data;
  },

  /**
   * Cancel a reservation
   */
  cancelReservation: async (id: string): Promise<void> => {
    await api.delete(`/reservations/${id}`);
  }
};
