
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { LibrarianSidebar } from './LibrarianSidebar';
import { loansApi } from '../api/loans';
import { BorrowStatus } from '../types/models';

export const LibrarianDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(''); // '' for all

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['loans', 'stats'],
    queryFn: loansApi.getStats,
  });

  // Fetch loans
  const { data: loansData, isLoading } = useQuery({
    queryKey: ['loans', page, search, statusFilter],
    queryFn: () => loansApi.getLoans({ 
      page, 
      page_size: 10, 
      search: search || undefined,
      status: statusFilter || undefined
    }),
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = status === 'ACTIVE' && new Date(dueDate) < new Date();
    
    if (status === 'RETURNED') {
      return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Đã trả</span>;
    }
    
    if (isOverdue) {
      return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Quá hạn</span>;
    }
    
    if (status === 'ACTIVE') {
      return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Đang mượn</span>;
    }
    
    return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">{status}</span>;
  };

  return (
    <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden text-[#343A40] dark:text-gray-200">
      <div className="flex min-h-screen">
        <LibrarianSidebar activePage="BORROW" />
        
        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 w-full">
          <div className="w-full max-w-7xl mx-auto">
            {/* PageHeading */}
            <div className="flex flex-wrap justify-between gap-4 items-center mb-6">
              <div className="flex flex-col gap-1">
                <p className="text-slate-900 dark:text-slate-50 text-3xl font-bold leading-tight">Quản lý Sách Mượn</p>
                <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">Theo dõi, quản lý và xem báo cáo về tình trạng sách trong thư viện.</p>
              </div>
              <button
                className="flex items-center justify-center overflow-hidden rounded-lg h-10 px-5 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] gap-2 hover:bg-primary/90 transition-colors"
                onClick={() => navigate('/librarian/books')}
              >
                <span className="material-symbols-outlined">add</span>
                <span className="truncate">Thêm sách mới</span>
              </button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-slate-600 dark:text-slate-300 text-base font-medium leading-normal">Tổng sách đang mượn</p>
                <p className="text-slate-900 dark:text-slate-50 tracking-tight text-3xl font-bold leading-tight">{stats?.active_loans || 0}</p>
                <p className="text-green-600 dark:text-green-500 text-sm font-medium leading-normal">Đang hoạt động</p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-slate-600 dark:text-slate-300 text-base font-medium leading-normal">Sách quá hạn</p>
                <p className="text-slate-900 dark:text-slate-50 tracking-tight text-3xl font-bold leading-tight">{stats?.overdue_loans || 0}</p>
                <p className="text-red-600 dark:text-red-500 text-sm font-medium leading-normal">Cần xử lý ngay</p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-slate-600 dark:text-slate-300 text-base font-medium leading-normal">Sách mới trong tuần</p>
                <p className="text-slate-900 dark:text-slate-50 tracking-tight text-3xl font-bold leading-tight">--</p>
                <p className="text-green-600 dark:text-green-500 text-sm font-medium leading-normal">Chưa cập nhật</p>
              </div>
            </div>
            
            {/* Search & Filters */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 shadow-sm">
              <div className="flex flex-col md:flex-row gap-4">
                {/* SearchBar */}
                <div className="flex-grow">
                  <label className="flex flex-col min-w-40 h-11 w-full">
                    <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                      <div className="text-slate-500 dark:text-slate-400 flex bg-slate-100 dark:bg-slate-800 items-center justify-center pl-4 rounded-l-lg border-r-0">
                        <span className="material-symbols-outlined">search</span>
                      </div>
                      <input 
                        className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-0 border-none bg-slate-100 dark:bg-slate-800 h-full placeholder:text-slate-500 dark:placeholder:text-slate-400 px-4 rounded-l-none border-l-0 pl-2 text-sm font-normal leading-normal" 
                        placeholder="Tìm theo tên sách, mã sách, tên người mượn..." 
                        value={search}
                        onChange={handleSearch}
                      />
                    </div>
                  </label>
                </div>
                {/* Chips as Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                  <button 
                    className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${!statusFilter ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    onClick={() => setStatusFilter('')}
                  >
                    <p className="text-sm font-medium leading-normal">Tất cả</p>
                  </button>
                  <button 
                    className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${statusFilter === 'ACTIVE' ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    onClick={() => setStatusFilter('ACTIVE')}
                  >
                    <p className="text-sm font-medium leading-normal">Đang mượn</p>
                  </button>
                  <button 
                    className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${statusFilter === 'RETURNED' ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    onClick={() => setStatusFilter('RETURNED')}
                  >
                    <p className="text-sm font-medium leading-normal">Đã trả</p>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Data Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                  <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-6 py-3" scope="col">Tên sách</th>
                      <th className="px-6 py-3" scope="col">Người mượn</th>
                      <th className="px-6 py-3" scope="col">Ngày mượn</th>
                      <th className="px-6 py-3" scope="col">Ngày hẹn trả</th>
                      <th className="px-6 py-3" scope="col">Trạng thái</th>
                      <th className="px-6 py-3" scope="col"><span className="sr-only">Hành động</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center">Đang tải...</td>
                      </tr>
                    ) : loansData?.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center">Không tìm thấy dữ liệu</td>
                      </tr>
                    ) : (
                      loansData?.items.map((loan) => (
                        <tr key={loan.id} className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                            {loan.book?.title || 'Unknown Book'}
                            <div className="text-xs text-gray-500 font-normal">{loan.copy?.barcode}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 dark:text-white">{loan.user?.full_name || loan.user?.username || 'Unknown User'}</span>
                              <span className="text-xs text-slate-500">{loan.user?.email || loan.user_id}</span>
                            </div> 
                          </td>
                          <td className="px-6 py-4">{format(new Date(loan.borrowed_at), 'dd/MM/yyyy')}</td>
                          <td className="px-6 py-4">{format(new Date(loan.due_date), 'dd/MM/yyyy')}</td>
                          <td className="px-6 py-4">
                            {getStatusBadge(loan.status, loan.due_date)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button className="text-slate-500 dark:text-slate-400 hover:text-primary p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                              <span className="material-symbols-outlined">more_horiz</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {loansData && loansData.total_pages > 1 && (
                <nav aria-label="Table navigation" className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700">
                  <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    Showing <span className="font-semibold text-slate-900 dark:text-white">{(page - 1) * 10 + 1}-{Math.min(page * 10, loansData.total)}</span> of <span className="font-semibold text-slate-900 dark:text-white">{loansData.total}</span>
                  </span>
                  <ul className="inline-flex -space-x-px text-sm h-8">
                    <li>
                      <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="flex items-center justify-center px-3 h-8 ml-0 leading-tight text-slate-500 bg-white border border-slate-300 rounded-l-lg hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white disabled:opacity-50"
                      >
                        Previous
                      </button>
                    </li>
                    {Array.from({ length: Math.min(5, loansData.total_pages) }, (_, i) => {
                      const p = i + 1; // Simplified pagination logic
                      return (
                        <li key={p}>
                          <button 
                            onClick={() => setPage(p)}
                            className={`flex items-center justify-center px-3 h-8 leading-tight border ${page === p ? 'text-primary border-slate-300 bg-primary/10 hover:bg-primary/20' : 'text-slate-500 bg-white border-slate-300 hover:bg-slate-100'} dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400`}
                          >
                            {p}
                          </button>
                        </li>
                      );
                    })}
                    <li>
                      <button 
                        onClick={() => setPage(p => Math.min(loansData.total_pages, p + 1))}
                        disabled={page === loansData.total_pages}
                        className="flex items-center justify-center px-3 h-8 leading-tight text-slate-500 bg-white border border-slate-300 rounded-r-lg hover:bg-slate-100 hover:text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white disabled:opacity-50"
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
