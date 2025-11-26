
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { LibrarianSidebar } from './LibrarianSidebar';
import { newsApi } from '../api/news';
import { NewsCategory } from '../types/models';

type StatusFilter = 'all' | 'published' | 'draft';
type CategoryFilter = 'all' | NewsCategory;

export const LibrarianNews: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [newsToDelete, setNewsToDelete] = useState<{ id: string; title: string } | null>(null);
  const queryClient = useQueryClient();

  const handleEdit = (newsId: string) => {
    navigate(`/librarian/news/edit/${newsId}`);
  };

  // Fetch news - show all news (including unpublished) for librarians
  const { data: newsData, isLoading } = useQuery({
    queryKey: ['news', page, search],
    queryFn: () => newsApi.getNews({ page, page_size: 12, published_only: false }),
  });

  // Filter news based on status and category
  const filteredNews = useMemo(() => {
    if (!newsData?.items) return [];

    let filtered = newsData.items;

    // Apply status filter
    if (statusFilter === 'published') {
      filtered = filtered.filter(item => item.published);
    } else if (statusFilter === 'draft') {
      filtered = filtered.filter(item => !item.published);
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Apply search filter
    if (search.trim()) {
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    return filtered;
  }, [newsData?.items, statusFilter, categoryFilter, search]);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: newsApi.deleteNews,
    onSuccess: () => {
      toast.success('Đã xóa tin tức');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: () => {
      toast.error('Lỗi khi xóa tin tức');
    }
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: newsApi.publishNews,
    onSuccess: () => {
      toast.success('Đã cập nhật trạng thái xuất bản');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: () => {
      toast.error('Lỗi khi cập nhật trạng thái');
    }
  });

  const handleDeleteClick = (id: string, title: string) => {
    setNewsToDelete({ id, title });
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (newsToDelete) {
      deleteMutation.mutate(newsToDelete.id);
      setDeleteModalOpen(false);
      setNewsToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setNewsToDelete(null);
  };

  const handlePublishToggle = (id: string) => {
    publishMutation.mutate(id);
  };

  const getStatusLabel = (status: StatusFilter) => {
    switch (status) {
      case 'all': return 'Tất cả';
      case 'published': return 'Đã xuất bản';
      case 'draft': return 'Nháp';
    }
  };

  const getCategoryLabel = (category: CategoryFilter) => {
    switch (category) {
      case 'all': return 'Tất cả';
      case NewsCategory.GENERAL: return 'Tin tức chung';
      case NewsCategory.EVENT: return 'Sự kiện';
      case NewsCategory.MAINTENANCE: return 'Bảo trì';
    }
  };

  return (
    <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden text-[#343A40] dark:text-gray-200">
      <div className="flex min-h-screen">
        <LibrarianSidebar activePage="NEWS" />
        
        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 w-full overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            {/* PageHeading */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex flex-col">
                <h1 className="text-[#0d141b] dark:text-white text-3xl font-black leading-tight tracking-tight">Quản lý Thông báo và Tin tức</h1>
                <p className="text-[#4c739a] dark:text-gray-400 text-base font-normal leading-normal mt-1">Tạo, chỉnh sửa và xuất bản các cập nhật mới nhất cho thư viện.</p>
              </div>
              <button 
                className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] gap-2 shadow-sm hover:bg-primary/90 transition-colors"
                onClick={() => navigate('/librarian/news/create')}
              >
                <span className="material-symbols-outlined" style={{fontSize: '20px'}}>add_circle</span>
                <span className="truncate">Tạo Thông báo Mới</span>
              </button>
            </div>

            {/* Toolbar: Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* SearchBar */}
              <div className="flex-grow">
                <label className="flex flex-col w-full">
                  <div className="flex w-full flex-1 items-stretch rounded-lg h-11 bg-white dark:bg-background-dark border border-slate-200 dark:border-gray-700 shadow-sm">
                    <div className="text-[#4c739a] dark:text-gray-400 flex items-center justify-center pl-4">
                      <span className="material-symbols-outlined">search</span>
                    </div>
                    <input 
                      className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141b] dark:text-gray-200 focus:outline-0 focus:ring-0 border-none bg-white dark:bg-background-dark h-full placeholder:text-[#4c739a] dark:placeholder:text-gray-500 px-2 text-sm font-normal leading-normal" 
                      placeholder="Tìm kiếm theo tiêu đề thông báo..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </label>
              </div>
              {/* Chips */}
              <div className="flex gap-2 flex-wrap">
                {/* Status Filter Dropdown */}
                <div className="relative">
                  <button
                    className="flex h-11 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-background-dark border border-slate-200 dark:border-gray-700 pl-3 pr-2 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  >
                    <p className="text-[#0d141b] dark:text-gray-300 text-sm font-medium leading-normal">Trạng thái: {getStatusLabel(statusFilter)}</p>
                    <span className="material-symbols-outlined text-[#4c739a] dark:text-gray-400" style={{fontSize: '20px'}}>arrow_drop_down</span>
                  </button>
                  {statusDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setStatusDropdownOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                        <div className="py-1">
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-gray-700 text-[#0d141b] dark:text-gray-300"
                            onClick={() => { setStatusFilter('all'); setStatusDropdownOpen(false); }}
                          >
                            Tất cả
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-gray-700 text-[#0d141b] dark:text-gray-300"
                            onClick={() => { setStatusFilter('published'); setStatusDropdownOpen(false); }}
                          >
                            Đã xuất bản
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-gray-700 text-[#0d141b] dark:text-gray-300"
                            onClick={() => { setStatusFilter('draft'); setStatusDropdownOpen(false); }}
                          >
                            Nháp
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Category Filter Dropdown */}
                <div className="relative">
                  <button
                    className="flex h-11 shrink-0 items-center justify-center gap-x-2 rounded-lg bg-white dark:bg-background-dark border border-slate-200 dark:border-gray-700 pl-3 pr-2 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  >
                    <p className="text-[#0d141b] dark:text-gray-300 text-sm font-medium leading-normal">Loại tin: {getCategoryLabel(categoryFilter)}</p>
                    <span className="material-symbols-outlined text-[#4c739a] dark:text-gray-400" style={{fontSize: '20px'}}>arrow_drop_down</span>
                  </button>
                  {categoryDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setCategoryDropdownOpen(false)}></div>
                      <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg shadow-lg z-20">
                        <div className="py-1">
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-gray-700 text-[#0d141b] dark:text-gray-300"
                            onClick={() => { setCategoryFilter('all'); setCategoryDropdownOpen(false); }}
                          >
                            Tất cả
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-gray-700 text-[#0d141b] dark:text-gray-300"
                            onClick={() => { setCategoryFilter(NewsCategory.GENERAL); setCategoryDropdownOpen(false); }}
                          >
                            Tin tức chung
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-gray-700 text-[#0d141b] dark:text-gray-300"
                            onClick={() => { setCategoryFilter(NewsCategory.EVENT); setCategoryDropdownOpen(false); }}
                          >
                            Sự kiện
                          </button>
                          <button
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-gray-700 text-[#0d141b] dark:text-gray-300"
                            onClick={() => { setCategoryFilter(NewsCategory.MAINTENANCE); setCategoryDropdownOpen(false); }}
                          >
                            Bảo trì
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
              {isLoading ? (
                // Skeletons
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex flex-col justify-between gap-4 rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-slate-200 dark:border-slate-700 animate-pulse h-64">
                    <div className="flex flex-col gap-3">
                      <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      <div className="h-6 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
                      <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                  </div>
                ))
              ) : filteredNews.length === 0 ? (
                <div className="col-span-full text-center py-12 text-slate-500">Không có tin tức nào.</div>
              ) : (
                filteredNews.map((item) => (
                  <div key={item.id} className="flex flex-col justify-between gap-4 rounded-xl bg-white dark:bg-gray-800 p-5 shadow-sm hover:shadow-lg transition-shadow duration-300 border border-slate-200 dark:border-slate-700">
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          {item.published ? (
                            <span className="inline-flex items-center rounded-md bg-green-50 dark:bg-green-900/50 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-600/20">Đã xuất bản</span>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-yellow-50 dark:bg-yellow-900/50 px-2 py-1 text-xs font-medium text-yellow-800 dark:text-yellow-300 ring-1 ring-inset ring-yellow-600/20">Nháp</span>
                          )}
                          <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/50 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-600/20">Tin tức</span>
                        </div>
                      </div>
                      <p className="text-[#0d141b] dark:text-white text-lg font-bold leading-tight line-clamp-2">{item.title}</p>
                      <p className="text-[#4c739a] dark:text-gray-400 text-sm font-normal leading-normal line-clamp-2">
                        Ngày: {item.published_at ? format(new Date(item.published_at), 'dd/MM/yyyy') : format(new Date(item.created_at), 'dd/MM/yyyy')}
                        <br/>
                        {item.summary || item.content.substring(0, 100)}...
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <button
                          className="flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-transparent hover:bg-primary/10 text-[#4c739a] dark:text-gray-400 dark:hover:text-white transition-colors"
                          onClick={() => handleEdit(item.id)}
                          title="Chỉnh sửa"
                        >
                          <span className="material-symbols-outlined" style={{fontSize: '20px'}}>edit</span>
                        </button>
                        <button
                          className="flex size-8 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-transparent hover:bg-red-500/10 text-[#4c739a] dark:text-gray-400 hover:text-red-500 transition-colors"
                          onClick={() => handleDeleteClick(item.id, item.title)}
                          title="Xóa"
                        >
                          <span className="material-symbols-outlined" style={{fontSize: '20px'}}>delete</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className={item.published ? "text-green-600 dark:text-green-400" : "text-yellow-600 dark:text-yellow-400"}>
                          {item.published ? "Hủy xuất bản" : "Xuất bản"}
                        </span>
                        <button 
                          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-background-dark ${item.published ? 'bg-green-600 dark:bg-green-500 focus:ring-green-600' : 'bg-gray-200 dark:bg-gray-600 focus:ring-primary'}`}
                          onClick={() => handlePublishToggle(item.id)}
                        >
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${item.published ? 'translate-x-5' : 'translate-x-0'}`}></span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {newsData && newsData.total_pages > 1 && (
              <div className="flex items-center justify-center mt-8">
                <nav aria-label="Pagination" className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                  <button 
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 cursor-pointer disabled:opacity-50"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                  >
                    <span className="material-symbols-outlined" style={{fontSize: '20px'}}>chevron_left</span>
                  </button>
                  
                  {Array.from({ length: Math.min(5, newsData.total_pages) }, (_, i) => {
                    const p = i + 1;
                    return (
                      <button 
                        key={p}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 cursor-pointer ${page === p ? 'bg-primary text-white focus-visible:outline-primary' : 'text-gray-900 dark:text-gray-300'}`}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    );
                  })}
                  
                  <button 
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 cursor-pointer disabled:opacity-50"
                    disabled={page === newsData.total_pages}
                    onClick={() => setPage(p => Math.min(newsData.total_pages, p + 1))}
                  >
                    <span className="material-symbols-outlined" style={{fontSize: '20px'}}>chevron_right</span>
                  </button>
                </nav>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && newsToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">warning</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Xác nhận xóa tin tức
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Bạn có chắc chắn muốn xóa tin tức này?
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 rounded p-2 mt-2">
                  "{newsToDelete.title}"
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Hành động này không thể hoàn tác!
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {deleteMutation.isPending && (
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                )}
                {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa tin tức'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
