import api from './axios';

export interface UploadResponse {
  url: string;
  filename: string;
}

export const uploadApi = {
  /**
   * Upload book cover image
   * @param bookId - Book ID to associate the cover with
   * @param file - Image file to upload
   * @returns Upload response with URL
   */
  uploadBookCover: async (bookId: string, file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<UploadResponse>(
      `/upload/book-cover/${bookId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  },
  
  /**
   * Upload news cover image
   * @param newsId - News ID to associate the cover with
   * @param file - Image file to upload
   * @returns Upload response with URL
   */
  uploadNewsCover: async (newsId: string, file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post<UploadResponse>(
      `/upload/news-cover/${newsId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    return response.data;
  },
};
