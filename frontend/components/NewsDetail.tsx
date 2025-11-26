
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { newsApi } from '../api/news';

export const NewsDetail: React.FC = () => {
  const { newsId } = useParams<{ newsId: string }>();
  const navigate = useNavigate();
  // Fetch news detail
  const { data: news, isLoading } = useQuery({
    queryKey: ['news', newsId],
    queryFn: () => newsId ? newsApi.getNewsDetail(newsId) : null,
    enabled: !!newsId,
  });

  // Fetch related news (latest 3)
  const { data: relatedNews } = useQuery({
    queryKey: ['news', 'related'],
    queryFn: () => newsApi.getNews({ page: 1, page_size: 4 }),
  });

  if (!newsId) {
    return <div>News ID missing</div>;
  }

  if (isLoading) {
    return (
      <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <div className="layout-container flex h-full grow flex-col">
          <PublicHeader activePage="NEWS" />
          <main className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </main>
          <PublicFooter />
        </div>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark">
        <div className="layout-container flex h-full grow flex-col">
          <PublicHeader activePage="NEWS" />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Không tìm thấy tin tức</h2>
              <button 
                onClick={() => navigate('/news')}
                className="text-primary hover:underline"
              >
                Quay lại danh sách tin tức
              </button>
            </div>
          </main>
          <PublicFooter />
        </div>
      </div>
    );
  }

  return (
    <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <PublicHeader activePage="NEWS" />
        
        <main className="px-4 py-8 md:py-12">
          {/* Breadcrumbs */}
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-x-2 text-sm text-slate-500 dark:text-slate-400">
              <a 
                className="hover:text-primary cursor-pointer" 
                onClick={() => navigate('/')}
              >
                Trang chủ
              </a>
              <span className="material-symbols-outlined text-base">chevron_right</span>
              <a 
                className="hover:text-primary cursor-pointer"
                onClick={() => navigate('/news')}
              >
                Thông báo
              </a>
              <span className="material-symbols-outlined text-base">chevron_right</span>
              <span className="text-slate-900 dark:text-slate-200 font-medium truncate">{news.title}</span>
            </div>
          </div>

          {/* Banner Image */}
          <div 
            className="w-full h-64 md:h-96 bg-center bg-no-repeat bg-cover rounded-xl mt-8" 
            style={{backgroundImage: `url("${news.cover_image || 'https://via.placeholder.com/1200x600?text=No+Image'}")`}}
          ></div>

          {/* Content Layout */}
          <div className="flex flex-col lg:flex-row gap-12 max-w-7xl mx-auto mt-8 md:mt-12 px-4">
            {/* Main Article */}
            <article className="w-full lg:w-2/3">
              <div className="flex flex-col gap-4">
                <span className="text-sm font-bold text-orange-500 uppercase">Tin tức</span>
                <h1 className="text-slate-900 dark:text-white text-3xl md:text-5xl font-extrabold leading-tight tracking-[-0.02em]">{news.title}</h1>
                <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 text-sm">
                  <span>Ngày đăng: {news.published_at ? format(new Date(news.published_at), 'dd/MM/yyyy') : 'N/A'}</span>
                  <span className="text-slate-300 dark:text-slate-700">|</span>
                  <span>Tác giả: Admin</span>
                </div>
              </div>
              
              <div className="prose prose-lg dark:prose-invert max-w-none mt-8 text-slate-800 dark:text-slate-300 leading-relaxed space-y-6">
                {/* Render HTML content safely */}
                <div dangerouslySetInnerHTML={{ __html: news.content }} />
              </div>

              {/* Share Buttons */}
              <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 flex items-center gap-4">
                <span className="text-slate-900 dark:text-slate-200 font-semibold">Chia sẻ bài viết:</span>
                <div className="flex gap-2">
                  <button className="flex items-center justify-center size-10 rounded-full text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"></path></svg>
                  </button>
                  <button className="flex items-center justify-center size-10 rounded-full text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.46 6c-.77.35-1.6.58-2.46.67.88-.53 1.56-1.37 1.88-2.38-.83.49-1.74.85-2.7 1.03A4.266 4.266 0 0016.32 4c-2.38 0-4.3 1.92-4.3 4.3 0 .34.04.67.11.98C8.2 9.09 4.33 6.96 1.76 3.64c-.35.6-.55 1.3-.55 2.05 0 1.49.76 2.81 1.91 3.58-.7-.02-1.37-.21-1.95-.54v.05c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 01-1.94.07 4.28 4.28 0 004 2.98 8.521 8.521 0 01-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16.3 21 20.4 14.2 20.4 8.38v-.43c.85-.61 1.58-1.37 2.16-2.24z"></path></svg>
                  </button>
                  <button className="flex items-center justify-center size-10 rounded-full text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                    <span className="material-symbols-outlined text-xl">link</span>
                  </button>
                </div>
              </div>
            </article>

            {/* Sidebar - Related News */}
            <aside className="w-full lg:w-1/3 lg:border-l lg:pl-12 lg:border-slate-200 lg:dark:border-slate-800">
              <div className="sticky top-24">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Tin liên quan</h3>
                <div className="flex flex-col gap-6">
                  {relatedNews?.items
                    .filter(item => item.id !== news.id)
                    .slice(0, 3)
                    .map(item => (
                      <a 
                        key={item.id}
                        className="group cursor-pointer"
                        onClick={() => navigate(`/news/${item.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-24 h-24 shrink-0 bg-center bg-no-repeat aspect-square bg-cover rounded-lg" 
                            style={{backgroundImage: `url("${item.cover_image || 'https://via.placeholder.com/150'}")`}}
                          ></div>
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-blue-500 uppercase mb-1">Tin tức</span>
                            <p className="text-slate-900 dark:text-white text-base font-semibold leading-snug group-hover:text-primary dark:group-hover:text-primary transition-colors line-clamp-2">{item.title}</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs font-normal leading-normal mt-2">
                              Ngày đăng: {item.published_at ? format(new Date(item.published_at), 'dd/MM/yyyy') : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </a>
                    ))
                  }
                </div>
              </div>
            </aside>
          </div>
        </main>

        <PublicFooter />
      </div>
    </div>
  );
};
