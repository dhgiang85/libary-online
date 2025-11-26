
import React, { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LibrarianSidebar } from './LibrarianSidebar';
import { newsApi } from '../api/news';
import { NewsCategory } from '../types/models';

export const LibrarianNewsEdit: React.FC = () => {
  const navigate = useNavigate();
  const { id: newsId } = useParams<{ id: string }>();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    summary: '',
    cover_image: '',
    category: NewsCategory.GENERAL,
    published: false,
    published_at: ''
  });

  const queryClient = useQueryClient();

  // Fetch existing news data
  const { data: newsData, isLoading } = useQuery({
    queryKey: ['news', newsId],
    queryFn: () => newsApi.getNewsDetail(newsId),
    enabled: !!newsId,
  });

  // Populate form with existing data
  useEffect(() => {
    if (newsData) {
      setFormData({
        title: newsData.title,
        content: newsData.content,
        summary: newsData.summary || '',
        cover_image: newsData.cover_image || '',
        category: newsData.category,
        published: newsData.published,
        published_at: newsData.published_at ? newsData.published_at.slice(0, 16) : '' // Format for datetime-local
      });
    }
  }, [newsData]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => newsApi.updateNews(newsId!, data),
    onSuccess: () => {
      toast.success('Đã cập nhật thông báo thành công!');
      queryClient.invalidateQueries({ queryKey: ['news'] });
      navigate('/librarian/news');
    },
    onError: (error: any) => {
      toast.error('Lỗi khi cập nhật thông báo: ' + (error.response?.data?.detail || error.message));
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      toast.error('Vui lòng điền đầy đủ tiêu đề và nội dung');
      return;
    }

    // Convert datetime-local string to ISO format if provided
    const submitData = {
      ...formData,
      published_at: formData.published_at ? new Date(formData.published_at).toISOString() : undefined
    };

    updateMutation.mutate(submitData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  return (
    <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-[#f6f7f8] dark:bg-[#101922] group/design-root overflow-x-hidden text-[#0d141b] dark:text-[#e7edf3]">
      <div className="flex min-h-screen">
        <LibrarianSidebar activePage="NEWS" />
        
        <main className="flex-1 p-8 w-full overflow-y-auto">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-col gap-8">
              <header>
                <h1 className="text-3xl font-black tracking-tight text-[#0d141b] dark:text-[#e7edf3]">Chỉnh sửa Thông báo / Tin tức</h1>
                <p className="text-[#4c739a] dark:text-[#9fb3c8] mt-1">Cập nhật thông tin thông báo của thư viện.</p>
              </header>
              <div className="rounded-lg border border-[#cfdbe7] dark:border-[#324458] bg-white dark:bg-[#1b2837] p-6">
                <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <label className="flex flex-col gap-2 md:col-span-2">
                      <p className="text-sm font-medium">Tiêu đề thông báo<span className="text-red-500 ml-1">*</span></p>
                      <input 
                        className="form-input w-full rounded-md border-[#cfdbe7] dark:border-[#324458] bg-[#f6f7f8] dark:bg-[#101922] focus:border-primary focus:ring-primary/50 placeholder:text-[#4c739a] dark:placeholder:text-[#9fb3c8] text-sm h-10 px-3" 
                        placeholder="Nhập tiêu đề..." 
                        type="text" 
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        required
                      />
                    </label>
                    <label className="flex flex-col gap-2 md:col-span-2">
                      <p className="text-sm font-medium">Tóm tắt</p>
                      <textarea 
                        className="form-textarea w-full rounded-md border-[#cfdbe7] dark:border-[#324458] bg-[#f6f7f8] dark:bg-[#101922] focus:border-primary focus:ring-primary/50 placeholder:text-[#4c739a] dark:placeholder:text-[#9fb3c8] text-sm p-3 h-24" 
                        placeholder="Nhập tóm tắt ngắn gọn..." 
                        name="summary"
                        value={formData.summary}
                        onChange={handleChange}
                      />
                    </label>
                    <label className="flex flex-col gap-2 md:col-span-2">
                      <p className="text-sm font-medium">Nội dung chi tiết<span className="text-red-500 ml-1">*</span></p>
                      <textarea
                        className="form-textarea w-full resize-y rounded-md border-[#cfdbe7] dark:border-[#324458] bg-[#f6f7f8] dark:bg-[#101922] focus:border-primary focus:ring-primary/50 p-3 min-h-48 placeholder:text-[#4c739a] dark:placeholder:text-[#9fb3c8] text-sm"
                        placeholder="Soạn thảo nội dung thông báo tại đây (Hỗ trợ HTML cơ bản)..."
                        name="content"
                        value={formData.content}
                        onChange={handleChange}
                        required
                      ></textarea>
                      <p className="text-xs text-[#4c739a] dark:text-[#9fb3c8]">Có thể sử dụng các thẻ HTML cơ bản như &lt;p&gt;, &lt;b&gt;, &lt;i&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;a&gt;, etc.</p>
                    </label>
                    
                    <div className="flex flex-col gap-2 md:col-span-2">
                      <p className="text-sm font-medium">Ảnh bìa (URL)</p>
                      <input
                        className="form-input w-full rounded-md border-[#cfdbe7] dark:border-[#324458] bg-[#f6f7f8] dark:bg-[#101922] focus:border-primary focus:ring-primary/50 placeholder:text-[#4c739a] dark:placeholder:text-[#9fb3c8] text-sm h-10 px-3"
                        placeholder="Nhập URL ảnh bìa..."
                        type="text"
                        name="cover_image"
                        value={formData.cover_image}
                        onChange={handleChange}
                      />
                      <p className="text-xs text-[#4c739a] dark:text-[#9fb3c8]">Nhập đường dẫn ảnh trực tiếp (ví dụ: https://example.com/image.jpg)</p>
                    </div>

                    <label className="flex flex-col gap-2">
                      <p className="text-sm font-medium">Loại tin tức<span className="text-red-500 ml-1">*</span></p>
                      <select
                        className="form-select w-full rounded-md border-[#cfdbe7] dark:border-[#324458] bg-[#f6f7f8] dark:bg-[#101922] focus:border-primary focus:ring-primary/50 text-sm h-10 px-3"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                      >
                        <option value={NewsCategory.GENERAL}>Tin tức chung</option>
                        <option value={NewsCategory.EVENT}>Sự kiện</option>
                        <option value={NewsCategory.MAINTENANCE}>Bảo trì</option>
                      </select>
                    </label>

                    <label className="flex flex-col gap-2">
                      <p className="text-sm font-medium">Ngày phát hành</p>
                      <input
                        className="form-input w-full rounded-md border-[#cfdbe7] dark:border-[#324458] bg-[#f6f7f8] dark:bg-[#101922] focus:border-primary focus:ring-primary/50 text-sm h-10 px-3"
                        type="datetime-local"
                        name="published_at"
                        value={formData.published_at}
                        onChange={handleChange}
                      />
                      <p className="text-xs text-[#4c739a] dark:text-[#9fb3c8]">Để trống để tự động sử dụng thời gian hiện tại khi xuất bản</p>
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input 
                      className="form-checkbox h-4 w-4 rounded border-[#cfdbe7] dark:border-[#324458] bg-[#f6f7f8] dark:bg-[#101922] text-primary focus:ring-primary/50" 
                      id="publish-now" 
                      type="checkbox"
                      name="published"
                      checked={formData.published}
                      onChange={handleCheckboxChange}
                    />
                    <label className="text-sm" htmlFor="publish-now">Xuất bản ngay sau khi tạo</label>
                  </div>
                  
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#cfdbe7] dark:border-[#324458]">
                    <button
                      className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-md h-10 px-4 bg-transparent text-[#0d141b] dark:text-[#e7edf3] text-sm font-bold border border-[#cfdbe7] dark:border-[#324458] hover:bg-primary/10 transition-colors"
                      type="button"
                      onClick={() => navigate('/librarian/news')}
                    >
                      <span className="truncate">Hủy bỏ</span>
                    </button>
                    <button
                      className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-md h-10 px-4 bg-primary text-white text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      type="submit"
                      disabled={updateMutation.isPending}
                    >
                      <span className="truncate">{updateMutation.isPending ? 'Đang cập nhật...' : 'Cập nhật Thông báo'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
