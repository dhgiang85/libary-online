import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { reservationsApi } from '../../api/reservations';
import { booksApi } from '../../api/books';
import { PublicHeader } from '../PublicHeader';
import { PublicFooter } from '../PublicFooter';
import { Reservation } from '../../types/models';

type StatusFilter = 'ALL' | 'PENDING' | 'FULFILLED' | 'CANCELLED' | 'EXPIRED';

export const MyReservations: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const pageSize = 10;

  // Fetch reservations
  const { data: reservationsData, isLoading } = useQuery({
    queryKey: ['my-reservations', currentPage, statusFilter],
    queryFn: () => reservationsApi.getMyReservations({
      page: currentPage,
      page_size: pageSize,
      status_filter: statusFilter === 'ALL' ? undefined : statusFilter
    }),
  });

  // Fetch book details for each reservation
  const reservationsWithBooks = useQuery({
    queryKey: ['reservations-with-books', reservationsData?.items],
    queryFn: async () => {
      if (!reservationsData?.items) return [];

      const reservationsWithBookData = await Promise.all(
        reservationsData.items.map(async (reservation) => {
          try {
            const book = await booksApi.getBook(reservation.book_id);
            return { ...reservation, book };
          } catch (error) {
            console.error('Error fetching book:', error);
            return { ...reservation, book: null };
          }
        })
      );
      return reservationsWithBookData;
    },
    enabled: !!reservationsData?.items && reservationsData.items.length > 0,
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: reservationsApi.cancelReservation,
    onSuccess: () => {
      toast.success('Đã hủy đặt trước thành công');
      queryClient.invalidateQueries({ queryKey: ['my-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['reservations-with-books'] });
    },
    onError: (error: any) => {
      toast.error('Lỗi: ' + (error.response?.data?.detail || error.message));
    }
  });

  const handleCancelReservation = (id: string, bookTitle: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn hủy đặt trước sách "${bookTitle}"?`)) {
      cancelMutation.mutate(id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
      case 'FULFILLED':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Đang chờ';
      case 'FULFILLED':
        return 'Đã hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
      case 'EXPIRED':
        return 'Hết hạn';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isExpiringSoon = (expiresAt: string) => {
    const now = new Date();
    const expiryDate = new Date(expiresAt);
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry <= 24 && hoursUntilExpiry > 0;
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-background-dark">
      <PublicHeader activePage="profile" />

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Sách đặt trước của tôi
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Quản lý các yêu cầu đặt trước sách khi tất cả bản sao đang được mượn
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
            <nav className="flex gap-4">
              {(['ALL', 'PENDING', 'FULFILLED', 'CANCELLED', 'EXPIRED'] as StatusFilter[]).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setStatusFilter(filter);
                    setCurrentPage(1);
                  }}
                  className={`pb-3 px-1 border-b-2 transition-colors font-medium text-sm ${
                    statusFilter === filter
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:border-gray-300'
                  }`}
                >
                  {filter === 'ALL' ? 'Tất cả' : getStatusLabel(filter)}
                </button>
              ))}
            </nav>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && (!reservationsData?.items || reservationsData.items.length === 0) && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                <span className="material-symbols-outlined text-4xl text-gray-400">bookmark_add</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Chưa có đặt trước nào
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Bạn chưa đặt trước sách nào. Đặt trước sách khi tất cả bản sao đang được mượn.
              </p>
              <button
                onClick={() => navigate('/books')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <span className="material-symbols-outlined">search</span>
                Khám phá sách
              </button>
            </div>
          )}

          {/* Reservations List */}
          {!isLoading && reservationsData && reservationsData.items.length > 0 && (
            <>
              <div className="space-y-4">
                {reservationsWithBooks.data?.map((reservation) => (
                  <div
                    key={reservation.id}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-6">
                      {/* Book Cover */}
                      <div className="flex-shrink-0">
                        {reservation.book?.cover_url ? (
                          <img
                            src={reservation.book.cover_url}
                            alt={reservation.book.title}
                            className="w-24 h-32 object-cover rounded-lg shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => navigate(`/books/${reservation.book_id}`)}
                          />
                        ) : (
                          <div className="w-24 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-gray-400">book</span>
                          </div>
                        )}
                      </div>

                      {/* Reservation Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3
                              className="text-lg font-semibold text-gray-900 dark:text-white mb-1 hover:text-primary cursor-pointer truncate"
                              onClick={() => navigate(`/books/${reservation.book_id}`)}
                            >
                              {reservation.book?.title || 'Đang tải...'}
                            </h3>
                            {reservation.book?.authors && reservation.book.authors.length > 0 && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {reservation.book.authors.map(a => a.name).join(', ')}
                              </p>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                            {getStatusLabel(reservation.status)}
                          </span>
                        </div>

                        {/* Reservation Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <span className="material-symbols-outlined text-[18px]">schedule</span>
                            <span>Đặt lúc: {formatDate(reservation.reserved_at)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                            <span className="material-symbols-outlined text-[18px]">event</span>
                            <span>Hết hạn: {formatDate(reservation.expires_at)}</span>
                          </div>
                        </div>

                        {/* Expiring Soon Warning */}
                        {reservation.status === 'PENDING' && isExpiringSoon(reservation.expires_at) && (
                          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
                            <div className="flex items-start gap-2">
                              <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-[20px]">warning</span>
                              <p className="text-sm text-amber-800 dark:text-amber-300">
                                Đặt trước này sẽ hết hạn trong vòng 24 giờ. Hãy kiểm tra xem sách đã sẵn sàng chưa!
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => navigate(`/books/${reservation.book_id}`)}
                            className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                            Xem sách
                          </button>
                          {reservation.status === 'PENDING' && (
                            <button
                              onClick={() => handleCancelReservation(reservation.id, reservation.book?.title || 'sách này')}
                              disabled={cancelMutation.isPending}
                              className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="material-symbols-outlined text-[18px]">cancel</span>
                              {cancelMutation.isPending ? 'Đang hủy...' : 'Hủy đặt trước'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {reservationsData.total_pages > 1 && (
                <div className="mt-8 flex justify-center items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </button>
                  <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                    Trang {currentPage} / {reservationsData.total_pages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(reservationsData.total_pages, p + 1))}
                    disabled={currentPage === reservationsData.total_pages}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </button>
                </div>
              )}

              {/* Info */}
              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">info</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                      Về đặt trước sách
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                      <li>Đặt trước được tạo khi tất cả bản sao của sách đang được mượn</li>
                      <li>Đặt trước có hiệu lực trong 48 giờ kể từ khi tạo</li>
                      <li>Bạn sẽ được ưu tiên mượn sách khi có bản sao được trả lại</li>
                      <li>Thủ thư sẽ liên hệ với bạn khi sách sẵn sàng</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
