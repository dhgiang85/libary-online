import api from "./axios";
import { Book } from "../types/models";

export interface CartItem {
  id: string;
  cart_id: string;
  book_id: string;
  added_at: string;
  book?: Book; // Will be populated with book details
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  items: CartItem[];
}

export interface AddToCartRequest {
  book_id: string;
}

export interface CheckoutRequest {
  due_date?: string; // ISO format datetime
}

export interface CheckoutResponse {
  success: boolean;
  message: string;
  borrow_records: any[];
  failed_books: any[];
}

export const cartApi = {
  /**
   * Get current user's cart
   */
  getCart: async (): Promise<Cart> => {
    const response = await api.get<Cart>("/cart");
    return response.data;
  },

  /**
   * Add a book to cart
   */
  addToCart: async (bookId: string): Promise<CartItem> => {
    const response = await api.post<CartItem>("/cart/items", {
      book_id: bookId
    });
    return response.data;
  },

  /**
   * Remove a book from cart
   */
  removeFromCart: async (bookId: string): Promise<void> => {
    await api.delete(`/cart/items/${bookId}`);
  },

  /**
   * Clear all items from cart
   */
  clearCart: async (): Promise<void> => {
    await api.delete("/cart/clear");
  },

  /**
   * Checkout cart - borrow all books
   */
  checkout: async (dueDate?: Date): Promise<CheckoutResponse> => {
    const data: CheckoutRequest = {};
    if (dueDate) {
      data.due_date = dueDate.toISOString();
    }
    const response = await api.post<CheckoutResponse>("/cart/checkout", data);
    return response.data;
  }
};
