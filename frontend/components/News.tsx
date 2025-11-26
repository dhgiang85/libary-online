
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { newsApi } from '../api/news';

export const News: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: newsData, isLoading } = useQuery({
    queryKey: ['news', page, search],
    queryFn: () => newsApi.getNews({ page, page_size: 9 }), // No search param in API yet?
    // Note: newsApi.getNews currently only accepts page and page_size in the interface defined in previous session?
    // Let's check newsApi definition.
  });

  return (
    <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <PublicHeader activePage="NEWS" />

        {/* Main Content */}
        <main className="px-4 md:container md:mx-auto md:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap justify-between gap-3 p-4 mt-4">
            <div className="flex min-w-72 flex-col gap-3">
              <p className="text-slate-900 dark:text-white text-4xl font-black leading-tight tracking-[-0.033em]">Thông báo và Tin tức</p>
              <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">Cập nhật các sự kiện, tin tức và thông báo mới nhất từ thư viện.</p>
            </div>
          </div>

          <div className="px-4 py-3 flex flex-col md:flex-row gap-4 items-center">
            <div className="w-full md:w-auto flex-grow">
              <label className="flex flex-col min-w-40 h-12 w-full">
                <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                  <div className="text-slate-500 dark:text-slate-400 flex border-none bg-slate-200 dark:bg-gray-800 items-center justify-center pl-4 rounded-l-lg border-r-0">
                    <span className="material-symbols-outlined">search</span>
                  </div>
                  <input 
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-0 border-none bg-slate-200 dark:bg-gray-800 focus:border-none h-full placeholder:text-slate-500 dark:placeholder:text-slate-400 px-4 pl-2 text-base font-normal leading-normal" 
                    placeholder="Tìm kiếm tin tức..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </label>
            </div>
            <div className="flex gap-3 overflow-x-auto w-full md:w-auto pb-2 no-scrollbar">
              <button className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-primary/20 dark:bg-primary/30 px-4 text-primary dark:text-white">
                <p className="text-sm font-medium leading-normal">Tất cả</p>
              </button>
              {/* TODO: Implement category filtering */}
              <button className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-slate-200 dark:bg-slate-800 px-4 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                <p className="text-slate-900 dark:text-slate-200 text-sm font-medium leading-normal">Sự kiện</p>
              </button>
              <button className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-slate-200 dark:bg-slate-800 px-4 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                <p className="text-slate-900 dark:text-slate-200 text-sm font-medium leading-normal">Bảo trì</p>
              </button>
              <button className="flex h-8 shrink-0 items-center justify-center gap-x-2 rounded-full bg-slate-200 dark:bg-slate-800 px-4 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                <p className="text-slate-900 dark:text-slate-200 text-sm font-medium leading-normal">Tin tức chung</p>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
            {isLoading ? (
              // Skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden animate-pulse">
                  <div className="w-full aspect-video bg-slate-200 dark:bg-slate-700"></div>
                  <div className="p-4 flex flex-col gap-2">
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-6 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
                    <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded mt-2"></div>
                  </div>
                </div>
              ))
            ) : newsData?.items.length === 0 ? (
              <div className="col-span-full text-center py-12 text-slate-500">Không có tin tức nào.</div>
            ) : (
              newsData?.items.map((item) => (
                <div 
                  key={item.id}
                  className="flex flex-col gap-3 rounded-xl bg-white dark:bg-gray-800 shadow-sm overflow-hidden transition-all hover:shadow-lg dark:hover:shadow-gray-700/30 cursor-pointer group"
                  onClick={() => navigate(`/news/${item.id}`)}
                >
                  <div 
                    className="w-full bg-center bg-no-repeat aspect-video bg-cover transform group-hover:scale-105 transition-transform duration-500" 
                    style={{backgroundImage: `url("${item.cover_image || 'https://via.placeholder.com/600x400?text=No+Image'}")`}}
                  ></div>
                  <div className="p-4 flex flex-col flex-grow relative bg-white dark:bg-gray-800 z-10">
                    <span className="text-xs font-semibold text-blue-500 uppercase">Tin tức</span>
                    <p className="text-slate-900 dark:text-white text-base font-bold leading-normal mt-1 flex-grow group-hover:text-primary transition-colors line-clamp-2">{item.title}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal mt-2 line-clamp-3">{item.summary || item.content.substring(0, 100)}...</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs font-normal leading-normal mt-3">
                      Ngày đăng: {item.published_at ? format(new Date(item.published_at), 'dd/MM/yyyy') : 'N/A'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {newsData && newsData.total_pages > 1 && (
            <div className="flex justify-center p-4 my-8">
              <nav className="flex items-center gap-2">
                <button 
                  className="flex items-center justify-center size-10 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                
                {Array.from({ length: Math.min(5, newsData.total_pages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button 
                      key={p}
                      className={`flex items-center justify-center size-10 rounded-lg transition-colors ${page === p ? 'bg-primary text-white' : 'text-slate-900 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                      onClick={() => setPage(p)}
                    >
                      {p}
                    </button>
                  );
                })}
                
                <button 
                  className="flex items-center justify-center size-10 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
                  disabled={page === newsData.total_pages}
                  onClick={() => setPage(p => Math.min(newsData.total_pages, p + 1))}
                >
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </nav>
            </div>
          )}
        </main>

        <PublicFooter />
      </div>
    </div>
  );
};
