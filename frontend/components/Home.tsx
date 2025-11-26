
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { booksApi } from '../api/books';
import { newsApi } from '../api/news';
import { authorsApi } from '../api/authors';
import { useAuthStore } from '../store/authStore';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  // Fetch latest news
  const { data: newsData, isLoading: isLoadingNews } = useQuery({
    queryKey: ['news', 'latest'],
    queryFn: () => newsApi.getNews({ page: 1, page_size: 3 }),
  });

  // Fetch featured books (highest rated)
  const { data: featuredBooks, isLoading: isLoadingFeatured } = useQuery({
    queryKey: ['books', 'featured'],
    queryFn: () => booksApi.getBooks({ page: 1, page_size: 4, sort: 'rating_desc' }),
  });

  // Fetch new books
  const { data: newBooks, isLoading: isLoadingNewBooks } = useQuery({
    queryKey: ['books', 'new'],
    queryFn: () => booksApi.getBooks({ page: 1, page_size: 10, sort: 'created_at_desc' }),
  });

  const { data: recentAuthors, isLoading: isLoadingAuthors } = useQuery({
    queryKey: ['authors', 'recent'],
    queryFn: () => authorsApi.getRecentAuthors(6),
  });

  // Helper to get full image URL
  const getImageUrl = (url: string | null) => {
    if (!url) return ''; // Will fallback to placeholder in the component logic if needed, or handle there
    if (url.startsWith('http')) return url;
    
    // Get base URL from env or default
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    // Remove /api/v1 suffix to get root URL
    const baseUrl = apiUrl.replace('/api/v1', '');
    
    return `${baseUrl}${url}`;
  };

  return (
    <div className="font-work bg-background-light dark:bg-background-dark text-[#343A40] dark:text-gray-200 min-h-screen flex flex-col">
      <PublicHeader activePage="HOME" />

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Featured Books Widget */}
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-xl shadow-sm">
              <h2 className="text-[#0d141b] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] mb-4">Sách Nổi bật</h2>
              
              {isLoadingFeatured ? (
                <div className="flex gap-4 overflow-hidden">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="min-w-[180px] animate-pulse">
                      <div className="h-60 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex overflow-x-auto no-scrollbar pb-2">
                  <div className="flex items-stretch gap-4">
                    {featuredBooks?.items.map((book) => (
                      <div 
                        key={book.id}
                        className="flex flex-col rounded-lg bg-background-light dark:bg-background-dark shadow-[0_2px_4px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_4px_rgba(0,0,0,0.2)] min-w-[180px] w-[180px] group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                        onClick={() => navigate(`/books/${book.id}`)}
                      >
                        <div 
                          className="w-full bg-center bg-no-repeat aspect-[3/4] bg-cover rounded-t-lg" 
                          style={{backgroundImage: `url("${getImageUrl(book.cover_url) || 'https://via.placeholder.com/300x400?text=No+Cover'}")`}}
                        ></div>
                        <div className="flex flex-col flex-1 p-3">
                          <div className="mb-2">
                            <p className="text-[#0d141b] dark:text-white text-sm font-medium leading-normal line-clamp-2 group-hover:text-primary" title={book.title}>
                              {book.title}
                            </p>
                          </div>
                          <div className="mt-auto">
                            {book.average_rating && (
                              <div className="flex items-center gap-1 mb-1">
                                <span className="text-yellow-500 text-xs">★</span>
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {book.average_rating.toFixed(1)} ({book.total_reviews || 0})
                                </span>
                              </div>
                            )}
                            <p className="text-gray-500 dark:text-gray-400 text-xs font-normal leading-normal">
                              {book.authors?.[0]?.name || 'Unknown Author'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {(!featuredBooks?.items || featuredBooks.items.length === 0) && (
                      <div className="w-full text-center py-8 text-gray-500">Chưa có sách nào</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Announcements Widget */}
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-xl shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-[#0d141b] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em]">Thông báo</h2>
                <button
                  className="text-primary hover:underline text-sm font-medium"
                  onClick={() => navigate('/news')}
                >
                  Xem tất cả
                </button>
              </div>
              
              {isLoadingNews ? (
                <div className="flex gap-4 overflow-hidden">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="min-w-[280px] animate-pulse">
                      <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3"></div>
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex overflow-x-auto no-scrollbar pb-2">
                  <div className="flex items-stretch gap-4">
                    {newsData?.items.map((news) => (
                      <div
                        key={news.id}
                        className="flex flex-col gap-3 rounded-lg min-w-[280px] sm:min-w-[320px] group cursor-pointer"
                        onClick={() => navigate(`/news/${news.id}`)}
                      >
                        <div 
                          className="w-full bg-center bg-no-repeat aspect-video bg-cover rounded-lg transform group-hover:scale-[1.02] transition-transform" 
                          style={{backgroundImage: `url("${getImageUrl(news.cover_image) || 'https://via.placeholder.com/640x360?text=News'}")`}}
                        ></div>
                        <div>
                          <p className="text-[#0d141b] dark:text-white text-base font-medium leading-normal group-hover:text-primary line-clamp-2">{news.title}</p>
                          <p className="text-gray-500 dark:text-gray-400 text-sm font-normal leading-normal line-clamp-2">{news.summary || news.content.substring(0, 100)}</p>
                        </div>
                      </div>
                    ))}
                    
                    {(!newsData?.items || newsData.items.length === 0) && (
                      <div className="w-full text-center py-8 text-gray-500">Chưa có thông báo nào</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar column */}
          <div className="lg:col-span-1 flex flex-col gap-8">
            {/* New Books Widget */}
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-xl shadow-sm">
              <h2 className="text-[#0d141b] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] mb-4">Sách Mới</h2>
              
              {isLoadingNewBooks ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="w-16 h-24 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
                      <div className="flex-1 py-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {newBooks?.items.map((book) => (
                    <div 
                      key={book.id}
                      className="flex items-center gap-4 group cursor-pointer"
                      onClick={() => navigate(`/books/${book.id}`)}
                    >
                      <div 
                        className="w-16 h-24 bg-center bg-no-repeat bg-cover rounded-md flex-shrink-0" 
                        style={{backgroundImage: `url("${getImageUrl(book.cover_url) || 'https://via.placeholder.com/100x150?text=No+Cover'}")`}}
                      ></div>
                      <div className="flex-1">
                        <span className="inline-block bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded-full mb-1">Mới</span>
                        <p className="text-[#0d141b] dark:text-white text-sm font-medium leading-normal group-hover:text-primary dark:group-hover:text-primary transition-colors line-clamp-2">
                          {book.title}
                        </p>
                        <p 
                          className="text-gray-500 dark:text-gray-400 text-xs mt-1 hover:text-primary cursor-pointer transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (book.authors?.[0]?.id) {
                              navigate(`/authors/${book.authors[0].id}`);
                            }
                          }}
                        >
                          {book.authors?.[0]?.name || 'Unknown Author'}
                        </p>
                      </div>
                    </div>
                  ))}
                  
                  {(!newBooks?.items || newBooks.items.length === 0) && (
                    <div className="text-center py-4 text-gray-500">Chưa có sách mới</div>
                  )}

                  <button
                    onClick={() => navigate('/books')}
                    className="w-full mt-2 flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors"
                  >
                    <span className="truncate">Xem tất cả</span>
                  </button>
                </div>
              )}
            </div>

            {/* New Authors Widget */}
            <div className="bg-white dark:bg-gray-800/50 p-6 rounded-xl shadow-sm">
              <h2 className="text-[#0d141b] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] mb-4">Tác giả mới</h2>
              {isLoadingAuthors ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-2">
                      <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"></div>
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 gap-4">
                  {recentAuthors?.map((author) => (
                    <div 
                      key={author.id} 
                      className="flex flex-col items-center text-center gap-2 group cursor-pointer"
                      onClick={() => navigate(`/authors/${author.id}`)}
                    >
                      <div 
                        className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-20 transform group-hover:scale-105 transition-transform bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400"
                      >
                        <span className="material-symbols-outlined text-4xl">person</span>
                      </div>
                      <p className="text-[#0d141b] dark:text-white text-sm font-medium leading-normal group-hover:text-primary transition-colors line-clamp-2">
                        {author.name}
                      </p>
                    </div>
                  ))}
                  {(!recentAuthors || recentAuthors.length === 0) && (
                    <div className="col-span-full text-center text-gray-500 py-4">Chưa có tác giả mới</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};