import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { LibrarianSidebar } from '../LibrarianSidebar';

interface Author {
  id: string;
  name: string;
  bio?: string;
  created_at: string;
  book_count?: number;
}

interface AuthorFormData {
  name: string;
  bio?: string;
}

export const AuthorManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<Author | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AuthorFormData>();

  // Fetch authors
  const { data: authorsData, isLoading } = useQuery({
    queryKey: ['authors', page, search],
    queryFn: async () => {
      const response = await api.get('/authors', {
        params: { page, page_size: pageSize, search }
      });
      // The API returns a list directly, not paginated object in the current implementation of get_all_authors
      // Wait, let's check authors.py. get_all_authors returns List[AuthorDetailResponse].
      // It DOES NOT return PaginatedResponse. It handles pagination but returns list.
      // This is inconsistent with other APIs.
      // However, the frontend needs to handle what the backend returns.
      // Let's assume for now it returns a list and we might not have total count for pagination UI if backend doesn't return it.
      // Actually, looking at authors.py, it just returns list.
      // So we can't do proper pagination UI (total pages) without total count.
      // For now, let's just display the list.
      return response.data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: AuthorFormData) => api.post('/authors/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authors'] });
      toast.success('Thêm tác giả thành công');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Thêm thất bại');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: AuthorFormData) => api.put(`/authors/${editingAuthor!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authors'] });
      toast.success('Cập nhật tác giả thành công');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Cập nhật thất bại');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/authors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['authors'] });
      toast.success('Xóa tác giả thành công');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Xóa thất bại');
    },
  });

  const onSubmit = (data: AuthorFormData) => {
    if (editingAuthor) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const openCreateModal = () => {
    setEditingAuthor(null);
    reset({ name: '', bio: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (author: Author) => {
    setEditingAuthor(author);
    reset({ name: author.name, bio: author.bio });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAuthor(null);
    reset();
  };

  const handleDelete = (author: Author) => {
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p className="font-medium text-gray-900 dark:text-white">
          Bạn có chắc muốn xóa tác giả <span className="font-bold">"{author.name}"</span>?
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
              deleteMutation.mutate(author.id);
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

  return (
    <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden text-[#343A40] dark:text-gray-200">
      <div className="flex min-h-screen">
        <LibrarianSidebar activePage="AUTHORS" />

        <main className="flex-1 p-4 md:p-8 w-full">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Quản lý Tác giả</h1>
              <button
                onClick={openCreateModal}
                className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <span className="material-symbols-outlined">add</span>
                Thêm tác giả
              </button>
            </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-gray-400">search</span>
            </span>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900 dark:text-white"
              placeholder="Tìm kiếm tác giả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tên tác giả
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tiểu sử
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Số sách
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {authorsData?.map((author: Author) => (
                    <tr key={author.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {author.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {author.bio || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {author.book_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => openEditModal(author)}
                          className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(author)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                  {authorsData?.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                        Không tìm thấy tác giả nào
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Simple Pagination Controls (since we don't have total pages) */}
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Trước
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300 self-center">
                Trang {page}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={!authorsData || authorsData.length < pageSize}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          </div>
        </div>
          </div>
        </main>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={closeModal}></div>
            </div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                  {editingAuthor ? 'Sửa tác giả' : 'Thêm tác giả mới'}
                </h3>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tên tác giả
                    </label>
                    <input
                      type="text"
                      id="name"
                      {...register('name', { required: 'Vui lòng nhập tên tác giả' })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tiểu sử
                    </label>
                    <textarea
                      id="bio"
                      rows={3}
                      {...register('bio')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:col-start-2 sm:text-sm"
                    >
                      {editingAuthor ? 'Cập nhật' : 'Thêm mới'}
                    </button>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:col-start-1 sm:text-sm"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
