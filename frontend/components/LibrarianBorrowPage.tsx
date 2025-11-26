import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { LibrarianSidebar } from './LibrarianSidebar';
import { borrowingApi, BorrowStatus } from '../api/borrowing';

export const LibrarianBorrowPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BorrowStatus | ''>('');

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ['borrowing', 'stats'],
    queryFn: borrowingApi.getStats,
  });

  // Fetch borrows
  const { data: borrows, isLoading } = useQuery({
    queryKey: ['borrowing', 'all', page, search, statusFilter],
    queryFn: () => borrowingApi.getAllBorrows({ 
      skip: (page - 1) * 10, 
      limit: 10, 
      search: search || undefined,
      status: statusFilter || undefined
    }),
  });

  // Mutations
  const confirmPickupMutation = useMutation({
    mutationFn: borrowingApi.confirmPickup,
    onSuccess: () => {
      toast.success('Đã xác nhận lấy sách');
      queryClient.invalidateQueries({ queryKey: ['borrowing'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Lỗi khi xác nhận');
    }
  });

  const returnBookMutation = useMutation({
    mutationFn: borrowingApi.returnBook,
    onSuccess: () => {
      toast.success('Đã trả sách thành công');
      queryClient.invalidateQueries({ queryKey: ['borrowing'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Lỗi khi trả sách');
    }
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const getStatusBadge = (status: BorrowStatus, dueDate: string) => {
    const isOverdue = status === BorrowStatus.ACTIVE && new Date(dueDate) < new Date();
    
    switch (status) {
      case BorrowStatus.PENDING:
        return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Chờ lấy sách</span>;
      case BorrowStatus.ACTIVE:
        if (isOverdue) {
          return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Quá hạn</span>;
        }
        return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Đang mượn</span>;
      case BorrowStatus.RETURNED:
        return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Đã trả</span>;
      case BorrowStatus.CANCELLED:
        return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Đã hủy</span>;
      case BorrowStatus.OVERDUE:
        return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Quá hạn</span>;
      default:
        return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">{status}</span>;
    }
  };

  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');
  
  const handleScanSubmit = () => {
    try {
      const data = JSON.parse(scanInput);
      if (data.borrow_ids && Array.isArray(data.borrow_ids)) {
        // Confirm pickup for all IDs
        // We'll do this sequentially for now or we could add a bulk endpoint
        // For simplicity, let's just loop
        let successCount = 0;
        let failCount = 0;
        
        Promise.all(data.borrow_ids.map((id: string) => 
          borrowingApi.confirmPickup(id)
            .then(() => successCount++)
            .catch(() => failCount++)
        )).then(() => {
          if (successCount > 0) toast.success(`Đã xác nhận ${successCount} sách`);
          if (failCount > 0) toast.error(`${failCount} sách thất bại`);
          setScanModalOpen(false);
          setScanInput('');
          queryClient.invalidateQueries({ queryKey: ['borrowing'] });
        });
      } else {
        toast.error('Mã QR không hợp lệ');
      }
    } catch (e) {
      toast.error('Mã QR không hợp lệ');
    }
  };

  const ScanModal = () => {
    if (!scanModalOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
          <button 
            onClick={() => setScanModalOpen(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Quét Mã QR</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nhập mã hoặc dán nội dung QR
            </label>
            <textarea
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              className="w-full h-32 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              placeholder='{"borrow_ids": ["..."]}'
            />
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setScanModalOpen(false)}
              className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleScanSubmit}
              disabled={!scanInput}
              className="flex-1 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    );
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
                onClick={() => setScanModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined">qr_code_scanner</span>
                <span className="font-medium">Quét QR</span>
              </button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-slate-600 dark:text-slate-300 text-base font-medium leading-normal">Tổng sách đang mượn</p>
                <p className="text-slate-900 dark:text-slate-50 tracking-tight text-3xl font-bold leading-tight">{stats?.active_borrows || 0}</p>
                <p className="text-green-600 dark:text-green-500 text-sm font-medium leading-normal">Đang hoạt động</p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-slate-600 dark:text-slate-300 text-base font-medium leading-normal">Sách quá hạn</p>
                <p className="text-slate-900 dark:text-slate-50 tracking-tight text-3xl font-bold leading-tight">{stats?.overdue_books || 0}</p>
                <p className="text-red-600 dark:text-red-500 text-sm font-medium leading-normal">Cần xử lý ngay</p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-slate-600 dark:text-slate-300 text-base font-medium leading-normal">Chờ lấy sách</p>
                <p className="text-slate-900 dark:text-slate-50 tracking-tight text-3xl font-bold leading-tight">{stats?.pending_pickups || 0}</p>
                <p className="text-yellow-600 dark:text-yellow-500 text-sm font-medium leading-normal">Cần xác nhận</p>
              </div>
              <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <p className="text-slate-600 dark:text-slate-300 text-base font-medium leading-normal">Đã trả hôm nay</p>
                <p className="text-slate-900 dark:text-slate-50 tracking-tight text-3xl font-bold leading-tight">{stats?.returned_today || 0}</p>
                <p className="text-blue-600 dark:text-blue-500 text-sm font-medium leading-normal">Hoàn thành</p>
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
                    className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${statusFilter === BorrowStatus.PENDING ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    onClick={() => setStatusFilter(BorrowStatus.PENDING)}
                  >
                    <p className="text-sm font-medium leading-normal">Chờ lấy</p>
                  </button>
                  <button 
                    className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${statusFilter === BorrowStatus.ACTIVE ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    onClick={() => setStatusFilter(BorrowStatus.ACTIVE)}
                  >
                    <p className="text-sm font-medium leading-normal">Đang mượn</p>
                  </button>
                  <button 
                    className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${statusFilter === BorrowStatus.RETURNED ? 'bg-primary/10 dark:bg-primary/20 text-primary' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    onClick={() => setStatusFilter(BorrowStatus.RETURNED)}
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
                      <th className="px-6 py-3" scope="col">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center">Đang tải...</td>
                      </tr>
                    ) : borrows?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center">Không tìm thấy dữ liệu</td>
                      </tr>
                    ) : (
                      borrows?.map((record) => (
                        <tr key={record.id} className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                            {record.book_title}
                            <div className="text-xs text-gray-500 font-normal">{record.copy_barcode}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-900 dark:text-white">{record.user_full_name || 'Unknown User'}</span>
                              <span className="text-xs text-slate-500">{record.user_email}</span>
                            </div> 
                          </td>
                          <td className="px-6 py-4">{format(new Date(record.borrowed_at), 'dd/MM/yyyy', { locale: vi })}</td>
                          <td className="px-6 py-4">{format(new Date(record.due_date), 'dd/MM/yyyy', { locale: vi })}</td>
                          <td className="px-6 py-4">
                            {getStatusBadge(record.status, record.due_date)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              {record.status === BorrowStatus.PENDING && (
                                <button 
                                  onClick={() => confirmPickupMutation.mutate(record.id)}
                                  className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs font-medium transition-colors"
                                >
                                  Xác nhận lấy
                                </button>
                              )}
                              {(record.status === BorrowStatus.ACTIVE || record.status === BorrowStatus.OVERDUE) && (
                                <button 
                                  onClick={() => returnBookMutation.mutate(record.id)}
                                  className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs font-medium transition-colors"
                                >
                                  Trả sách
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Simple Pagination */}
              <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="text-sm">Trang {page}</span>
                <button 
                  onClick={() => setPage(p => p + 1)}
                  disabled={!borrows || borrows.length < 10}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            </div>
            
            <ScanModal />
          </div>
        </main>
      </div>
    </div>
  );
};
