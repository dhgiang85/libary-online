
import React from 'react';
import { useNavigate } from 'react-router-dom';

interface LibrarianSidebarProps {
  activePage: 'DASHBOARD' | 'BOOKS' | 'AUTHORS' | 'GENRES' | 'MEMBERS' | 'BORROW' | 'NEWS';
}

export const LibrarianSidebar: React.FC<LibrarianSidebarProps> = ({ activePage }) => {
  const navigate = useNavigate();
  return (
    <aside className="flex w-64 flex-col bg-white dark:bg-background-dark border-r border-slate-200 dark:border-slate-800 p-4 shrink-0 hidden md:flex shadow-sm z-10">
      <div className="flex h-full flex-col justify-between">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-2 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div
              className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 cursor-pointer"
              data-alt="User avatar"
              style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuC-KhT9cnmvwnSfnDywgiLGUmSDp4u2sKuXuv5Kmr88Y1DtQFGvVu9E17wZ-QIA1zkYzj0vivdMYrendPZiS2n_ttakYc3-5rzsBUHFKMOk5TMpMfZxyQqJcUVi_ve6dTQJoRfkmP3Ah8vG3uXwqcefQtPgwHna5WQX8PlFAoZMGwxHp8GoWMONqDBe9WRYq-wIfT_mFGGvVpy_lB97PvJuNqBfu_eALbIyycBI070z6VPucRrk-moWr-LgR1vpioKZ3p2rJW-Q3BE")'}}
              onClick={() => navigate('/')}
              title="Back to Home"
            ></div>
            <div className="flex flex-col">
              <h1 className="text-slate-900 dark:text-slate-100 text-base font-medium leading-normal">Nguyễn Văn An</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-normal leading-normal">Thủ thư</p>
            </div>
          </div>
          <nav className="flex flex-col gap-2">
            <a
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${activePage === 'DASHBOARD' ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              onClick={() => navigate('/librarian')}
            >
              <span className={`material-symbols-outlined ${activePage === 'DASHBOARD' ? 'fill' : ''}`}>dashboard</span>
              <p className="text-sm font-medium leading-normal">Tổng quan</p>
            </a>
            
            {/* Book Management */}
            <a
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${activePage === 'BOOKS' ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              onClick={() => navigate('/librarian/books')}
            >
              <span className={`material-symbols-outlined ${activePage === 'BOOKS' ? 'fill' : ''}`}>book</span>
              <p className="text-sm font-medium leading-normal">Quản lý Sách</p>
            </a>

            <a
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${activePage === 'AUTHORS' ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              onClick={() => navigate('/librarian/authors')}
            >
              <span className={`material-symbols-outlined ${activePage === 'AUTHORS' ? 'fill' : ''}`}>person</span>
              <p className="text-sm font-medium leading-normal">Quản lý Tác giả</p>
            </a>

            <a
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${activePage === 'GENRES' ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              onClick={() => navigate('/librarian/genres')}
            >
              <span className={`material-symbols-outlined ${activePage === 'GENRES' ? 'fill' : ''}`}>category</span>
              <p className="text-sm font-medium leading-normal">Quản lý Thể loại</p>
            </a>

            <a
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${activePage === 'MEMBERS' ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              onClick={() => navigate('/librarian/members')}
            >
              <span className={`material-symbols-outlined ${activePage === 'MEMBERS' ? 'fill' : ''}`}>groups</span>
              <p className="text-sm font-medium leading-normal">Quản lý Thành viên</p>
            </a>

            <a
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${activePage === 'BORROW' ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              onClick={() => navigate('/librarian/borrow')}
            >
              <span className={`material-symbols-outlined ${activePage === 'BORROW' ? 'fill' : ''}`}>receipt_long</span>
              <p className="text-sm font-medium leading-normal">Quản lý Mượn/Trả</p>
            </a>

            <a
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${activePage === 'NEWS' ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              onClick={() => navigate('/librarian/news')}
            >
              <span className={`material-symbols-outlined ${activePage === 'NEWS' ? 'fill' : ''}`}>campaign</span>
              <p className="text-sm font-medium leading-normal">Thông báo & Tin tức</p>
            </a>
          </nav>
        </div>
        <div className="flex flex-col gap-1 pt-4 border-t border-slate-100 dark:border-slate-800">
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <span className="material-symbols-outlined">settings</span>
            <p className="text-sm font-medium leading-normal">Cài đặt</p>
          </a>
          <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
            <span className="material-symbols-outlined">help</span>
            <p className="text-sm font-medium leading-normal">Hỗ trợ</p>
          </a>
          <button
            className="flex w-full min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 mt-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
            onClick={() => navigate('/')}
          >
            <span className="truncate">Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
