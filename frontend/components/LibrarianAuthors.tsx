import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authorsApi, AuthorDetail, CreateAuthorData, UpdateAuthorData } from '../api/authors';
import { LibrarianSidebar } from './LibrarianSidebar';
import { PublicHeader } from './PublicHeader';

export const LibrarianAuthors: React.FC = () => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<AuthorDetail | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [authorToDelete, setAuthorToDelete] = useState<AuthorDetail | null>(null);

  const queryClient = useQueryClient();

  // Fetch authors
  const { data: authors, isLoading } = useQuery({
    queryKey: ['authors', search],
    queryFn: () => authorsApi.getAuthors({ search: search || undefined, page_size: 100 }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: authorsApi.deleteAuthor,
    onSuccess: () => {
      toast.success('Đã xóa tác giả');
      queryClient.invalidateQueries({ queryKey: ['authors'] });
      setDeleteModalOpen(false);
      setAuthorToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Không thể xóa tác giả');
    },
  });

  const handleEdit = (author: AuthorDetail) => {
    setEditingAuthor(author);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingAuthor(null);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (author: AuthorDetail) => {
    setAuthorToDelete(author);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (authorToDelete) {
      deleteMutation.mutate(authorToDelete.id);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <PublicHeader activePage="HOME" />

      <div className="flex flex-1">
        <LibrarianSidebar activePage="authors" />

        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Quản lý Tác giả
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Quản lý thông tin tác giả trong hệ thống
              </p>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Tìm kiếm tác giả..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <button
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined">add</span>
                Thêm tác giả
              </button>
            </div>

            {/* Authors Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                </div>
              ) : !authors || authors.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {search ? 'Không tìm thấy tác giả nào' : 'Chưa có tác giả nào'}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Tên tác giả
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Tiểu sử
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Số sách
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {authors.map((author) => (
                        <tr
                          key={author.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {author.name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500 dark:text-gray-400 max-w-md truncate">
                              {author.bio || '-'}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {author.book_count || 0} sách
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleEdit(author)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                              title="Sửa"
                            >
                              <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteClick(author)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Xóa"
                            >
                              <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <AuthorModal
          author={editingAuthor}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAuthor(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && authorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">
                  warning
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Xác nhận xóa tác giả
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Bạn có chắc chắn muốn xóa tác giả này?
                </p>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-4">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {authorToDelete.name}
                  </p>
                  {authorToDelete.book_count && authorToDelete.book_count > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      ⚠️ Tác giả có {authorToDelete.book_count} sách. Không thể xóa!
                    </p>
                  )}
                </div>
                <p className="text-xs text-red-600 dark:text-red-400">
                  ⚠️ Hành động này không thể hoàn tác!
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setAuthorToDelete(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending || (authorToDelete.book_count || 0) > 0}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleteMutation.isPending && (
                  <span className="material-symbols-outlined animate-spin text-sm">
                    progress_activity
                  </span>
                )}
                {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa tác giả'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Author Modal Component
interface AuthorModalProps {
  author: AuthorDetail | null;
  onClose: () => void;
}

const AuthorModal: React.FC<AuthorModalProps> = ({ author, onClose }) => {
  const [name, setName] = useState(author?.name || '');
  const [bio, setBio] = useState(author?.bio || '');
  const queryClient = useQueryClient();

  const isEditMode = !!author;

  const createMutation = useMutation({
    mutationFn: (data: CreateAuthorData) => authorsApi.createAuthor(data),
    onSuccess: () => {
      toast.success('Đã thêm tác giả mới');
      queryClient.invalidateQueries({ queryKey: ['authors'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Có lỗi xảy ra');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; updates: UpdateAuthorData }) =>
      authorsApi.updateAuthor(data.id, data.updates),
    onSuccess: () => {
      toast.success('Đã cập nhật tác giả');
      queryClient.invalidateQueries({ queryKey: ['authors'] });
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Có lỗi xảy ra');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Vui lòng nhập tên tác giả');
      return;
    }

    if (isEditMode && author) {
      updateMutation.mutate({
        id: author.id,
        updates: { name: name.trim(), bio: bio.trim() || undefined },
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        bio: bio.trim() || undefined,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Cập nhật tác giả' : 'Thêm tác giả mới'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tên tác giả <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Nhập tên tác giả"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tiểu sử
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              placeholder="Nhập tiểu sử tác giả (tùy chọn)"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending && (
                <span className="material-symbols-outlined animate-spin text-sm">
                  progress_activity
                </span>
              )}
              {isPending
                ? 'Đang xử lý...'
                : isEditMode
                ? 'Cập nhật'
                : 'Thêm tác giả'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
