
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { booksApi } from '../api/books';
import { copiesApi } from '../api/copies';
import { reservationsApi } from '../api/reservations';
import { borrowingApi, BorrowStatus } from '../api/borrowing';
import { ReviewList } from './reviews/ReviewList';
import { useAuthStore } from '../store/authStore';
import { useCartStore } from '../store/cartStore';
import { RatingStars } from './reviews/RatingStars';
import { BookCopy, CopyStatus } from '../types/models';

type Tab = 'PUBLICATION' | 'REVIEWS' | 'RELATED';

export const BookDetail: React.FC = () => {
  const navigate = useNavigate();
  const { bookId } = useParams<{ bookId: string }>();
  const { isAuthenticated, user } = useAuthStore();
  const { addToCart, hasBook } = useCartStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('REVIEWS');

  // Fetch book details
  const { data: book, isLoading } = useQuery({
    queryKey: ['books', bookId],
    queryFn: () => booksApi.getBook(bookId!),
    enabled: !!bookId,
  });

  // Fetch book copies to check availability
  // Note: We might need a specific endpoint for copies or include it in book details
  // For now assuming we can get copies or availability status from book details or a separate call
  // Let's assume book details includes some availability info or we fetch copies
  // Since our backend Book model doesn't strictly include copies list in getBook by default unless eager loaded,
  // but let's assume for this UI we might need to fetch copies if not present.
  // Actually, let's use the search/stats endpoint or just assume book has copies count.
  // The backend `Book` model has `total_copies` and `available_copies` properties (computed).
  // Let's check `Book` interface in `types/models.ts`. It doesn't have them yet.
  // I should probably update `types/models.ts` or just use what I have.
  // Let's assume for now we can borrow if `available_copies > 0`.
  
  // Borrow mutation
  const borrowMutation = useMutation({
    mutationFn: (copyId: string) => copiesApi.borrowCopy(copyId),
    onSuccess: () => {
      toast.success('Đăng ký mượn sách thành công! Vui lòng đến thư viện nhận sách.');
      queryClient.invalidateQueries({ queryKey: ['books', bookId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Mượn sách thất bại');
    },
  });

  // Reserve mutation
  const reserveMutation = useMutation({
    mutationFn: () => reservationsApi.createReservation(bookId!),
    onSuccess: () => {
      toast.success('Đặt trước sách thành công!');
      queryClient.invalidateQueries({ queryKey: ['books', bookId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Đặt trước thất bại');
    },
  });

  // Fetch user's borrow history to check status
  const { data: borrowHistory } = useQuery({
    queryKey: ['borrow-history'],
    queryFn: () => borrowingApi.getMyHistory(),
    enabled: isAuthenticated,
  });

  const isBorrowed = borrowHistory?.some(
    record => record.book_title === book?.title && 
    (record.status === BorrowStatus.ACTIVE || record.status === BorrowStatus.PENDING)
  );

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để thêm vào giỏ');
      return;
    }
    
    if (hasBook(bookId!)) {
      toast.error('Sách đã có trong giỏ');
      return;
    }

    if (isBorrowed) {
      toast.error('Bạn đang mượn hoặc chờ lấy sách này');
      return;
    }

    try {
      await addToCart(bookId!);
      toast.success('Đã thêm sách vào giỏ!');
    } catch (error: any) {
      // Error already handled in store
    }
  };

  const handleReserve = () => {
    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để đặt trước');
      return;
    }
    reserveMutation.mutate();
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return 'https://via.placeholder.com/300x400?text=No+Cover';
    if (url.startsWith('http')) return url;
    
    // Get base URL from env or default
    const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000/api/v1';
    // Remove /api/v1 suffix to get root URL
    const baseUrl = apiUrl.replace('/api/v1', '');
    
    return `${baseUrl}${url}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-gray-500">Không tìm thấy sách</p>
        <button onClick={() => navigate('/')} className="text-primary hover:underline">
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden text-slate-900 dark:text-white">
      <div className="layout-container flex h-full grow flex-col">
        <PublicHeader activePage="HOME" />

        <main className="flex-1 py-8 px-4 sm:px-6 justify-center flex">
          <div className="w-full max-w-5xl flex flex-col gap-8">
            
            {/* Breadcrumbs */}
            <div className="flex flex-wrap gap-2 text-sm">
              <a
                className="text-slate-500 dark:text-slate-400 font-medium hover:text-primary hover:underline cursor-pointer"
                onClick={() => navigate('/')}
              >
                Trang chủ
              </a>
              <span className="text-slate-400">/</span>
              <a 
                className="text-slate-500 dark:text-slate-400 font-medium hover:text-primary hover:underline cursor-pointer"
                onClick={() => {
                  if (book.genres?.[0]?.name) {
                    navigate(`/books?genre=${encodeURIComponent(book.genres[0].name)}`);
                  }
                }}
              >
                {book.genres?.[0]?.name || 'Sách'}
              </a>
              <span className="text-slate-400">/</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {book.title}
              </span>
            </div>

            {/* Top Section: Book Info */}
            <div className="flex flex-col md:flex-row gap-8 lg:gap-10">
              {/* Left Column: Image */}
              <div className="flex-shrink-0 w-full md:w-64 lg:w-72 flex justify-center md:justify-start">
                <div 
                  className="w-48 md:w-full rounded-lg shadow-lg overflow-hidden aspect-[2/3] bg-cover bg-center bg-no-repeat"
                  style={{backgroundImage: `url("${getImageUrl(book.cover_url)}")`}}
                ></div>
              </div>

              {/* Right Column: Info */}
              <div className="flex flex-col gap-4 flex-1">
                <div className="flex gap-2">
                  {book.genres?.map(genre => (
                    <span key={genre.id} className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300">
                      {genre.name}
                    </span>
                  ))}
                </div>

                <div>
                  <h1 className="text-3xl md:text-4xl font-bold leading-tight tracking-tight mb-1">
                    {book.title}
                  </h1>
                  <p className="text-lg text-slate-600 dark:text-slate-400">
                    bởi {book.authors?.map((author, idx) => (
                      <span key={author.id}>
                        <a 
                          className="text-primary font-medium hover:underline cursor-pointer" 
                          onClick={() => navigate(`/authors/${author.id}`)}
                        >
                          {author.name}
                        </a>
                        {idx < (book.authors?.length || 0) - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <RatingStars rating={book.average_rating || 0} size={20} />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    {book.average_rating?.toFixed(1)} ({book.total_reviews} đánh giá)
                  </span>
                </div>

                <div className="py-2 text-slate-700 dark:text-slate-300 leading-relaxed text-sm md:text-base">
                  <p>{book.description}</p>
                </div>

                <div className="flex flex-wrap gap-3 mt-auto pt-2">
                  {/* Show Add to Cart button only when available_copies > 0 */}
                  {(book.available_copies ?? 0) > 0 && (
                    <button
                      onClick={handleAddToCart}
                      disabled={hasBook(bookId!) || isBorrowed}
                      className="flex-1 sm:flex-none h-10 px-6 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                      {isBorrowed ? 'Đang mượn' : hasBook(bookId!) ? 'Đã trong giỏ' : 'Thêm vào giỏ'}
                    </button>
                  )}

                  {/* Show Reserve button only when available_copies = 0 */}
                  {(book.available_copies ?? 0) === 0 && (
                    <button
                      onClick={handleReserve}
                      disabled={!isAuthenticated || reserveMutation.isPending}
                      className="flex-1 sm:flex-none h-10 px-6 rounded-lg border-2 border-amber-500 text-amber-600 dark:text-amber-400 font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[20px]">bookmark_add</span>
                      {reserveMutation.isPending ? 'Đang xử lý...' : 'Đặt trước'}
                    </button>
                  )}

                  {/* Show availability info */}
                  <div className="w-full flex items-center gap-2 text-sm">
                    {(book.available_copies ?? 0) > 0 ? (
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        <span>{book.available_copies} bản sao sẵn sàng</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                        <span className="material-symbols-outlined text-[18px]">info</span>
                        <span>Tất cả bản sao đang được mượn. Bạn có thể đặt trước để được ưu tiên khi sách trả về.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs & Content */}
            <div className="mt-4">
              <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex gap-8">
                  <button
                    onClick={() => setActiveTab('REVIEWS')}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'REVIEWS'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                  >
                    Đánh giá
                  </button>
                  <button
                    onClick={() => setActiveTab('PUBLICATION')}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'PUBLICATION'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                  >
                    Thông tin xuất bản
                  </button>
                  <button
                    onClick={() => setActiveTab('RELATED')}
                    className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === 'RELATED'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                    }`}
                  >
                    Sách liên quan
                  </button>
                </nav>
              </div>

              <div className="min-h-[300px]">
                {activeTab === 'PUBLICATION' && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-100 dark:border-slate-700 max-w-2xl animate-in fade-in duration-300">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                      <div className="sm:col-span-2 border-b border-slate-200 dark:border-slate-700 pb-2 mb-2">
                        <dt className="font-bold text-lg">Chi tiết xuất bản</dt>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Nhà xuất bản</dt>
                        <dd className="text-sm font-semibold mt-1">{book.publisher || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Năm xuất bản</dt>
                        <dd className="text-sm font-semibold mt-1">{book.publication_year || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">ISBN</dt>
                        <dd className="text-sm font-semibold mt-1">{book.isbn || 'N/A'}</dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Số trang</dt>
                        <dd className="text-sm font-semibold mt-1">{book.pages || 'N/A'}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-slate-500 dark:text-slate-400">Vị trí</dt>
                        <dd className="text-sm font-semibold mt-1">
                          {book.location?.floor ? `Tầng ${book.location.floor}, ` : ''}
                          {book.location?.shelf ? `Kệ ${book.location.shelf}, ` : ''}
                          {book.location?.row ? `Hàng ${book.location.row}` : ''}
                        </dd>
                      </div>
                    </dl>
                  </div>
                )}

                {activeTab === 'REVIEWS' && (
                  <div className="animate-in fade-in duration-300">
                    <ReviewList bookId={bookId!} />
                  </div>
                )}

                {activeTab === 'RELATED' && (
                  <div className="animate-in fade-in duration-300 py-12 text-center text-slate-500">
                    <span className="material-symbols-outlined text-4xl mb-2 block">auto_stories</span>
                    <p>Danh sách sách liên quan đang được cập nhật.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <PublicFooter />
      </div>
    </div>
  );
};

