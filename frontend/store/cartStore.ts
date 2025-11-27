import { create } from 'zustand';
import { cartApi, Cart, CartItem } from '../api/cart';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchCart: () => Promise<void>;
  addToCart: (bookId: string) => Promise<void>;
  removeFromCart: (bookId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  checkout: (dueDate?: Date) => Promise<{ success: boolean; message: string; borrow_records?: any[] }>;
  
  // Computed
  itemCount: () => number;
  hasBook: (bookId: string) => boolean;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  isLoading: false,
  error: null,

  fetchCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const cart = await cartApi.getCart();
      set({ cart, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to fetch cart',
        isLoading: false 
      });
    }
  },

  addToCart: async (bookId: string) => {
    set({ isLoading: true, error: null });
    try {
      await cartApi.addToCart(bookId);
      // Refresh cart after adding
      await get().fetchCart();
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to add book to cart',
        isLoading: false 
      });
      throw error;
    }
  },

  removeFromCart: async (bookId: string) => {
    set({ isLoading: true, error: null });
    try {
      await cartApi.removeFromCart(bookId);
      // Refresh cart after removing
      await get().fetchCart();
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to remove book from cart',
        isLoading: false 
      });
      throw error;
    }
  },

  clearCart: async () => {
    set({ isLoading: true, error: null });
    try {
      await cartApi.clearCart();
      set({ cart: { ...get().cart!, items: [] }, isLoading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.detail || 'Failed to clear cart',
        isLoading: false 
      });
      throw error;
    }
  },

  checkout: async (dueDate?: Date) => {
    set({ isLoading: true, error: null });
    try {
      const result = await cartApi.checkout(dueDate);
      // Clear cart after successful checkout
      set({ cart: { ...get().cart!, items: [] }, isLoading: false });
      return { 
        success: true, 
        message: result.message,
        borrow_records: result.borrow_records 
      };
    } catch (error: any) {
      // Extract error message properly
      let message = 'Checkout failed';
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        
        // Handle object with message field
        if (typeof detail === 'object' && detail.message) {
          message = detail.message;
          // Optionally include failed books info
          if (detail.failed_books && detail.failed_books.length > 0) {
            const failedTitles = detail.failed_books
              .map((fb: any) => fb.book_title)
              .join(', ');
            message += `: ${failedTitles}`;
          }
        }
        // Handle string detail
        else if (typeof detail === 'string') {
          message = detail;
        }
      }
      
      set({ error: message, isLoading: false });
      return { success: false, message };
    }
  },

  // Computed properties
  itemCount: () => {
    return get().cart?.items?.length || 0;
  },

  hasBook: (bookId: string) => {
    return get().cart?.items?.some(item => item.book_id === bookId) || false;
  },
}));
