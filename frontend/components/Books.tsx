import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { booksApi, BookFilters } from '../api/books';
import { genresApi } from '../api/genres';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

export const Books: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlGenre = searchParams.get('genre') || '';
  const urlSearch = searchParams.get('search') || '';

  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [tempSearch, setTempSearch] = useState(urlSearch);

  useEffect(() => {
    if (urlSearch) {
      setSearchQuery(urlSearch);
      setTempSearch(urlSearch);
    }
    if (urlGenre) {
      setSelectedGenre(urlGenre);
    }
  }, [urlSearch, urlGenre]);

  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [selectedGenre, setSelectedGenre] = useState<string>(urlGenre);
  const [selectedAuthor, setSelectedAuthor] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Helper to get full image URL
  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return 'https://via.placeholder.com/300x400?text=No+Cover';
    if (url.startsWith('http')) return url;

    // Get base URL from env or default
    // @ts-ignore
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    // Remove /api/v1 suffix to get root URL
    const baseUrl = apiUrl.replace('/api/v1', '');

    return `${baseUrl}${url}`;
  };

  const filters: BookFilters = {
    page: currentPage,
    page_size: pageSize,
    search: searchQuery || undefined,
    min_rating: minRating > 0 ? minRating : undefined,
    genre: selectedGenre || undefined,
    authors: selectedAuthor || undefined,
    sort: sortBy || undefined,
  };

  const { data: booksData, isLoading } = useQuery({
    queryKey: ['books', filters],
    queryFn: () => booksApi.getBooks(filters),
  });

  // Fetch genres for filter dropdown
  const { data: genresData } = useQuery({
    queryKey: ['genres-list'],
    queryFn: () => genresApi.getAllGenres(),
  });

  const handleSearch = () => {
    setSearchQuery(tempSearch);
    setCurrentPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleRatingFilter = (rating: number) => {
    setMinRating(rating === minRating ? 0 : rating);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setOnlyAvailable(false);
    setMinRating(0);
    setSelectedGenre('');
    setSelectedAuthor('');
    setSortBy('');
    setSearchQuery('');
    setTempSearch('');
    setCurrentPage(1);
  };

  const hasActiveFilters = onlyAvailable || minRating > 0 || selectedGenre || selectedAuthor || sortBy || searchQuery;

  const totalPages = booksData ? booksData.total_pages : 0;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark">
      <PublicHeader activePage="BOOKS" />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Compact Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-50 mb-2">
            Thư viện sách
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {booksData?.total || 0} cuốn sách
          </p>
        </div>

        {/* Modern Search & Filter Bar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6">
          {/* Search Row */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
                search
              </span>
              <input
                type="text"
                placeholder="Tìm kiếm sách, tác giả, ISBN..."
                value={tempSearch}
                onChange={(e) => setTempSearch(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary text-slate-900 dark:text-slate-50"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-slate-50 min-w-[160px]"
            >
              <option value="">Sắp xếp</option>
              <option value="rating_desc">Đánh giá cao nhất</option>
              <option value="created_at_desc">Mới nhất</option>
              <option value="title_asc">Tên A-Z</option>
            </select>

            {/* Search Button */}
            <button
              onClick={handleSearch}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 justify-center"
            >
              <span className="material-symbols-outlined text-lg">search</span>
              <span className="hidden sm:inline">Tìm kiếm</span>
            </button>
          </div>

          {/* Quick Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="form-checkbox rounded text-primary focus:ring-primary/50 w-4 h-4"
              />
              <span className="text-slate-700 dark:text-slate-300">Còn sách</span>
            </label>

            {/* Rating Filter */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg">
              <span className="text-slate-600 dark:text-slate-400 text-xs">Đánh giá:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => handleRatingFilter(rating)}
                    className={`material-symbols-outlined text-base transition-colors ${
                      rating <= minRating ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-300'
                    }`}
                  >
                    star
                  </button>
                ))}
              </div>
              {minRating > 0 && (
                <span className="text-xs text-slate-500 dark:text-slate-400">+</span>
              )}
            </div>

            {/* Advanced Filters Toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors"
            >
              <span className="material-symbols-outlined text-base">tune</span>
              <span>Nâng cao</span>
              <span className={`material-symbols-outlined text-base transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}>
                expand_more
              </span>
            </button>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="ml-auto flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-base">close</span>
                <span>Xóa bộ lọc</span>
              </button>
            )}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Thể loại
                  </label>
                  <select
                    value={selectedGenre}
                    onChange={(e) => {
                      setSelectedGenre(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-slate-50"
                  >
                    <option value="">Tất cả thể loại</option>
                    {genresData && Array.isArray(genresData) ? (
                      genresData.map((genre: any) => (
                        <option key={genre.id} value={genre.name}>
                          {genre.name}
                        </option>
                      ))
                    ) : (
                      // Fallback hardcoded options if fetch fails or loading
                      <>
                        <option value="Tiểu thuyết">Tiểu thuyết</option>
                        <option value="Phi hư cấu">Phi hư cấu</option>
                        <option value="Khoa học">Khoa học</option>
                        <option value="Lịch sử">Lịch sử</option>
                        <option value="Triết học">Triết học</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">
                    Tác giả
                  </label>
                  <input
                    type="text"
                    placeholder="Nhập tên tác giả..."
                    value={selectedAuthor}
                    onChange={(e) => {
                      setSelectedAuthor(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-slate-900 dark:text-slate-50"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Books Grid */}
        {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
        ) : !booksData || booksData.items.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-4">search_off</span>
            <p className="text-xl">Không tìm thấy sách nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {booksData.items.map((book) => {
                const isAvailable = book.available_copies && book.available_copies > 0;
                const rating = book.average_rating || 0;
                const fullStars = Math.floor(rating);
                const hasHalfStar = rating % 1 >= 0.5;

                return (
                  <div
                    key={book.id}
                    className="flex flex-col gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 transition-shadow hover:shadow-lg cursor-pointer"
                    onClick={() => navigate(`/books/${book.id}`)}
                  >
                    <img
                      className="w-full h-56 object-cover rounded-lg"
                      src={getImageUrl(book.cover_url)}
                      alt={book.title}
                    />
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-50 line-clamp-1">
                          {book.title}
                        </h3>
                        <span
                          className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full w-fit whitespace-nowrap ${
                            isAvailable
                              ? 'text-green-800 bg-green-100 dark:bg-green-900/30 dark:text-green-300'
                              : 'text-red-800 bg-red-100 dark:bg-red-900/30 dark:text-red-300'
                          }`}
                        >
                          {isAvailable ? 'Có sẵn' : 'Đã mượn'}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        bởi {book.authors?.map((a) => a.name).join(', ') || 'Unknown'}
                      </p>
                      {book.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 mt-2">
                          {book.description}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-2">
                        <div className="flex text-amber-400">
                          {[...Array(fullStars)].map((_, i) => (
                            <span key={i} className="material-symbols-outlined text-base">
                              star
                            </span>
                          ))}
                          {hasHalfStar && (
                            <span className="material-symbols-outlined text-base">star_half</span>
                          )}
                          {[...Array(5 - fullStars - (hasHalfStar ? 1 : 0))].map((_, i) => (
                            <span
                              key={i}
                              className="material-symbols-outlined text-base text-slate-300 dark:text-slate-600"
                            >
                              star
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {rating.toFixed(1)} ({book.total_reviews || 0} đánh giá)
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/books/${book.id}`);
                      }}
                      className={`flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 w-full text-sm font-bold leading-normal tracking-[0.015em] transition-colors mt-2 ${
                        isAvailable
                          ? 'bg-primary text-slate-50 hover:bg-primary/90'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      <span className="truncate">
                        {isAvailable ? 'Thêm vào giỏ sách' : 'Xem chi tiết'}
                      </span>
                    </button>
                  </div>
                );
              })}
          </div>
        )}

        {/* Pagination */}
        {booksData && booksData.items.length > 0 && (
            <div className="flex items-center justify-center mt-10">
              <nav className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex items-center justify-center size-9 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-xl">chevron_left</span>
                </button>

                {getPageNumbers().map((page, index) => (
                  <React.Fragment key={index}>
                    {page === '...' ? (
                      <span className="text-slate-500 dark:text-slate-400">...</span>
                    ) : (
                      <button
                        onClick={() => setCurrentPage(page as number)}
                        className={`flex items-center justify-center size-9 rounded-lg text-sm font-medium ${
                          currentPage === page
                            ? 'text-white bg-primary'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {page}
                      </button>
                    )}
                  </React.Fragment>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex items-center justify-center size-9 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-xl">chevron_right</span>
                </button>
              </nav>
            </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
};
