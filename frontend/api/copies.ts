import api from './axios';
import { BookCopy, BorrowRecord } from '../types/models';

export const copiesApi = {
  getCopiesByBookId: async (bookId: string) => {
    const response = await api.get<BookCopy[]>(`/books/${bookId}/copies`);
    return response.data;
  },

  borrowCopy: async (copyId: string) => {
    const response = await api.post<BorrowRecord>(`/book-copies/${copyId}/borrow`);
    return response.data;
  },

  returnCopy: async (copyId: string) => {
    const response = await api.post<BorrowRecord>(`/book-copies/${copyId}/return`);
    return response.data;
  },

  createCopy: async (data: { book_id: string; barcode: string }) => {
    const response = await api.post<BookCopy>('/book-copies', data);
    return response.data;
  },

  deleteCopy: async (id: string) => {
    await api.delete(`/book-copies/${id}`);
  }
};
