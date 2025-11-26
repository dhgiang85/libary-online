import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { PublicHeader } from '../PublicHeader';
import { PublicFooter } from '../PublicFooter';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cart, isLoading, fetchCart, removeFromCart } = useCartStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleRemove = async (bookId: string) => {
    try {
      await removeFromCart(bookId);
      toast.success('Đã xóa sách khỏi giỏ');
    } catch (error) {
      toast.error('Không thể xóa sách');
    }
  };

  const handleCheckout = async () => {
    setIsCheckingOut(true);
    try {
      const result = await useCartStore.getState().checkout();
      if (result.success) {
        navigate('/cart/checkout', { state: { borrow_records: result.borrow_records } });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Có lỗi xảy ra khi mượn sách');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return 'https://via.placeholder.com/300x400?text=No+Cover';
    if (url.startsWith('http')) return url;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const baseUrl = apiUrl.replace('/api/v1', '');
    return `${baseUrl}${url}`;
  };

  const getAvailabilityBadge = (availableCopies: number) => {
    if (availableCopies === 0) {
      return (
        <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/40 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300">
          Hết sách
        </span>
      );
    } else if (availableCopies <= 5) {
      return (
        <span className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/40 px-3 py-1 text-xs font-medium text-yellow-800 dark:text-yellow-300">
          Sắp hết
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/40 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300">
          Còn sách
        </span>
      );
    }
  };

  const totalBooks = cart?.items?.length || 0;
  const totalDeposit = cart?.items?.reduce((sum, item) => sum + (item.book?.deposit_fee || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="font-display relative flex min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <PublicHeader />
      
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumbs */}
          <div className="flex flex-wrap gap-2 mb-6">
            <a
              onClick={() => navigate('/')}
              className="text-sm font-medium leading-normal text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary cursor-pointer"
            >
              Trang chủ
            </a>
            <span className="text-sm font-medium leading-normal text-slate-500 dark:text-slate-400">/</span>
            <span className="text-sm font-medium leading-normal text-[#0d141b] dark:text-slate-50">Giỏ sách</span>
          </div>

          {/* Header */}
          <div className="mb-8">
            <p className="text-4xl font-black leading-tight tracking-[-0.033em] text-[#0d141b] dark:text-slate-50">
              Giỏ Sách Của Bạn
            </p>
            <p className="mt-2 text-base font-normal leading-normal text-slate-600 dark:text-slate-400">
              Kiểm tra danh sách sách bạn đã chọn và phí đặt cọc trước khi hoàn tất.
            </p>
          </div>

          {cart?.items && cart.items.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-12">
              {/* Books List */}
              <div className="lg:col-span-2 space-y-4">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 bg-white dark:bg-background-dark p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm"
                  >
                    <img
                      className="w-16 h-24 object-cover rounded-lg flex-shrink-0"
                      src={getImageUrl(item.book?.cover_url || null)}
                      alt={item.book?.title || 'Book cover'}
                    />
                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold leading-tight text-[#0d141b] dark:text-slate-50 truncate">
                              {item.book?.title || 'Unknown Title'}
                            </p>
                            <p className="text-sm font-normal leading-normal text-slate-500 dark:text-slate-400 mt-0.5">
                              {item.book?.authors?.map(a => a.name).join(', ') || 'Unknown Author'}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemove(item.book_id)}
                            className="text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-500 p-1 rounded-full flex-shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {getAvailabilityBadge(item.book?.available_copies || 0)}
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Phí: <span className="font-bold text-[#0d141b] dark:text-slate-50">
                              {(item.book?.deposit_fee || 0).toLocaleString('vi-VN')}đ
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="lg:col-span-1 mt-8 lg:mt-0">
                <div className="sticky top-24">
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-background-dark p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-[#0d141b] dark:text-slate-50">
                      Tóm tắt yêu cầu mượn
                    </h3>
                    <div className="mt-6 space-y-3">
                      <div className="flex justify-between items-center text-base">
                        <span className="text-slate-600 dark:text-slate-400">Tổng số sách</span>
                        <span className="font-bold text-[#0d141b] dark:text-slate-50">{totalBooks}</span>
                      </div>
                      <div className="flex justify-between items-center text-base">
                        <span className="text-slate-600 dark:text-slate-400">Tổng phí đặt cọc</span>
                        <span className="font-bold text-[#0d141b] dark:text-slate-50">
                          {totalDeposit.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                    <div className="mt-8">
                      <button
                        onClick={handleCheckout}
                        disabled={isCheckingOut}
                        className="flex w-full items-center justify-center rounded-lg h-12 bg-primary text-white text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors disabled:opacity-50"
                      >
                        {isCheckingOut ? 'Đang xử lý...' : 'Hoàn tất mượn'}
                      </button>
                      <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                        Bằng cách nhấn nút, bạn đồng ý với{' '}
                        <a className="font-medium underline hover:text-primary" href="#">
                          phí đặt cọc
                        </a>{' '}
                        của thư viện.
                      </p>
                      <a
                        onClick={() => navigate('/')}
                        className="mt-4 flex w-full items-center justify-center gap-2 text-sm font-medium text-primary hover:underline cursor-pointer"
                      >
                        Tiếp tục khám phá sách
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShoppingBag className="h-24 w-24 text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-xl font-medium text-gray-500 dark:text-gray-400 mb-2">
                Giỏ sách của bạn đang trống
              </p>
              <button
                onClick={() => navigate('/')}
                className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Khám phá sách ngay
              </button>
            </div>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
