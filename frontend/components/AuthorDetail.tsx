
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { authorsApi } from '../api/authors';

export const AuthorDetail: React.FC = () => {
  const { authorId } = useParams<{ authorId: string }>();
  const navigate = useNavigate();

  // Fetch author details
  const { data: author, isLoading: isLoadingAuthor } = useQuery({
    queryKey: ['authors', authorId],
    queryFn: () => authorId ? authorsApi.getAuthor(authorId) : null,
    enabled: !!authorId,
  });

  // Fetch author's books
  const { data: booksData, isLoading: isLoadingBooks } = useQuery({
    queryKey: ['authors', authorId, 'books'],
    queryFn: () => authorId ? authorsApi.getAuthorBooks(authorId, { page: 1, page_size: 20 }) : null,
    enabled: !!authorId,
  });

  const getImageUrl = (url: string | null | undefined) => {
    if (!url) return 'https://via.placeholder.com/300x400?text=No+Cover';
    if (url.startsWith('http')) return url;
    
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const baseUrl = apiUrl.replace('/api/v1', '');
    
    return `${baseUrl}${url}`;
  };

  if (!authorId) {
    return <div>Author ID missing</div>;
  }

  if (isLoadingAuthor) {
    return (
      <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <div className="layout-container flex h-full grow flex-col">
          <PublicHeader activePage="HOME" />
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </main>
          <PublicFooter />
        </div>
      </div>
    );
  }

  if (!author) {
    return (
      <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <div className="layout-container flex h-full grow flex-col">
          <PublicHeader activePage="HOME" />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Không tìm thấy tác giả</h2>
              <button 
                onClick={() => navigate('/')}
                className="text-primary hover:underline"
              >
                Quay lại trang chủ
              </button>
            </div>
          </main>
          <PublicFooter />
        </div>
      </div>
    );
  }

  return (
    <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
      <div className="layout-container flex h-full grow flex-col">
        <PublicHeader activePage="HOME" />
        
        <main className="px-4 py-8 md:px-8">
          {/* Author Profile Section */}
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 p-4 max-w-6xl mx-auto">
            {/* Author Avatar Placeholder */}
            <div className="flex-shrink-0">
              <div className="w-40 h-40 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shadow-lg">
                <span className="material-symbols-outlined text-6xl text-primary">person</span>
              </div>
            </div>
            
            {/* Author Info */}
            <div className="flex flex-col flex-grow items-center md:items-start text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {author.name}
              </h1>
              
              {author.bio && (
                <p className="mt-4 text-base text-slate-600 dark:text-slate-400 max-w-2xl">
                  {author.bio}
                </p>
              )}
              
              <div className="flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-2 mt-4 text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">menu_book</span>
                  <span>{author.book_count} cuốn sách</span>
                </div>
              </div>
              
              {/* Follow Button - Placeholder for future functionality */}
              <button className="mt-6 flex items-center justify-center gap-2 h-10 px-6 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
                <span className="material-symbols-outlined text-xl">add</span>
                <span>Theo dõi tác giả</span>
              </button>
            </div>
          </div>

          {/* Books Section */}
          <div className="mt-12 max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white px-4 mb-6">
              Sách của tác giả
            </h2>
            
            {isLoadingBooks ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[2/3] w-full rounded-lg bg-gray-200 dark:bg-gray-700 mb-3"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : booksData && booksData.items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 px-4">
                {booksData.items.map((book) => (
                  <div 
                    key={book.id} 
                    className="flex flex-col gap-3 group cursor-pointer"
                    onClick={() => navigate(`/books/${book.id}`)}
                  >
                    <div className="aspect-[2/3] w-full rounded-lg overflow-hidden shadow-md group-hover:shadow-xl transition-shadow">
                      <div 
                        className="w-full h-full bg-cover bg-center" 
                        style={{backgroundImage: `url("${getImageUrl(book.cover_url)}")`}}
                      ></div>
                    </div>
                    <div className="flex flex-col">
                      <h3 className="font-semibold text-slate-800 dark:text-white line-clamp-2 group-hover:text-primary transition-colors">
                        {book.title}
                      </h3>
                      {book.average_rating && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-yellow-500 text-xs">★</span>
                          <span className="text-xs text-slate-600 dark:text-slate-400">
                            {book.average_rating.toFixed(1)} ({book.total_reviews || 0})
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                Chưa có sách nào của tác giả này
              </div>
            )}
          </div>
        </main>

        <PublicFooter />
      </div>
    </div>
  );
};
