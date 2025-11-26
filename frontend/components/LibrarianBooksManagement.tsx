import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { booksApi } from '../api/books';
import { Book } from '../types/models';
import { LibrarianSidebar } from './LibrarianSidebar';
import { AddBookModal } from './books/AddBookModal';

export const LibrarianBooksManagement: React.FC = () => {
  const navigate = useNavigate();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  // Fetch books
  const { data: booksData, isLoading } = useQuery({
    queryKey: ['books', 'librarian', currentPage, searchQuery],
    queryFn: () => booksApi.getBooks({
      page: currentPage,
      page_size: 10,
      search: searchQuery || undefined,
    }),
  });

  // Delete book mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log('Calling API delete for id:', id);
      return booksApi.deleteBook(id);
    },
    onSuccess: () => {
      console.log('Delete success');
      toast.success('Xóa sách thành công!');
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
    onError: (error: any) => {
      console.error('Delete failed:', error);
      toast.error(`Xóa sách thất bại: ${error.message || 'Lỗi không xác định'}`);
    },
  });

  const handleDelete = (book: Book) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-medium text-gray-900 dark:text-white">
          Bạn có chắc muốn xóa sách <span className="font-bold">"{book.title}"</span>?
        </p>
        <p className="text-xs text-gray-500">Hành động này không thể hoàn tác.</p>
        <div className="flex gap-2 justify-end mt-1">
          <button 
            className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
            onClick={() => toast.dismiss(t.id)}
          >
            Hủy
          </button>
          <button 
            className="px-3 py-1.5 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            onClick={() => {
              deleteMutation.mutate(book.id);
              toast.dismiss(t.id);
            }}
          >
            Xóa
          </button>
        </div>
      </div>
    ), {
      duration: 5000,
      position: 'top-center',
      style: {
        background: '#fff',
        color: '#333',
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      },
      className: 'dark:bg-gray-800 dark:text-white dark:border dark:border-gray-700',
    });
  };

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    setIsAddModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingBook(undefined);
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return 'https://via.placeholder.com/60x90?text=No+Cover';
    if (url.startsWith('http')) return url;
    
    // Get base URL from env or default
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    // Remove /api/v1 suffix to get root URL
    const baseUrl = apiUrl.replace('/api/v1', '');
    
    return `${baseUrl}${url}`;
  };

  return (
    <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden text-[#343A40] dark:text-gray-200">
      <div className="flex min-h-screen">
        <LibrarianSidebar activePage="BOOKS" />
        
        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 w-full">
          <div className="w-full max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý sách</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Quản lý thông tin sách trong thư viện
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <span className="material-symbols-outlined">add</span>
                Thêm sách mới
              </button>
            </div>

            {/* Search */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm mb-6">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm sách theo tên, tác giả, ISBN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Books list */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">Đang tải...</p>
                </div>
              ) : booksData && booksData.items.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Sách
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Tác giả
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Thể loại
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Bản sao
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Thao tác
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {booksData.items.map((book) => (
                          <tr key={book.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={getImageUrl(book.cover_url)}
                                  alt={book.title}
                                  className="w-12 h-16 object-cover rounded"
                                />
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white line-clamp-1">
                                    {book.title}
                                  </div>
                                  {book.isbn && (
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                      ISBN: {book.isbn}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {book.authors.map(a => a.name).join(', ') || 'N/A'}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {book.genres.slice(0, 2).map((genre) => (
                                  <span
                                    key={genre.id}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                  >
                                    {genre.name}
                                  </span>
                                ))}
                                {book.genres.length > 2 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    +{book.genres.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 dark:text-green-400 font-medium">
                                  {book.available_copies}
                                </span>
                                <span>/</span>
                                <span>{book.total_copies}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => navigate(`/books/${book.id}`)}
                                  className="text-primary hover:text-primary/80 p-1"
                                  title="Xem chi tiết"
                                >
                                  <span className="material-symbols-outlined text-xl">visibility</span>
                                </button>
                                <button
                                  onClick={() => handleEdit(book)}
                                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                                  title="Sửa"
                                >
                                  <span className="material-symbols-outlined text-xl">edit</span>
                                </button>
                                <button
                                  onClick={() => handleDelete(book)}
                                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                                  title="Xóa"
                                >
                                  <span className="material-symbols-outlined text-xl">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {booksData.total_pages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Trang {booksData.page} / {booksData.total_pages} (Tổng {booksData.total} sách)
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Trước
                          </button>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(booksData.total_pages, p + 1))}
                            disabled={currentPage === booksData.total_pages}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Sau
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600">
                    menu_book
                  </span>
                  <p className="mt-2 text-gray-500 dark:text-gray-400">
                    {searchQuery ? 'Không tìm thấy sách nào' : 'Chưa có sách nào'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add Book Modal */}
      <AddBookModal 
        isOpen={isAddModalOpen} 
        onClose={handleCloseModal} 
        initialData={editingBook}
      />
    </div>
  );
};
