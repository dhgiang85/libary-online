import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LibrarianSidebar } from './LibrarianSidebar';
import { borrowingApi, BorrowStatus } from '../api/borrowing';
import { BorrowTableRow } from './librarian/BorrowTableRow';
import { BorrowStatsCards } from './librarian/BorrowStatsCards';
import { BorrowFilters } from './librarian/BorrowFilters';
import { ScanQRModal } from './librarian/ScanQRModal';

export const LibrarianBorrowPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BorrowStatus | ''>('');
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');

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

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = status === 'ACTIVE' && new Date(dueDate) < new Date();
    
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">Chờ lấy sách</span>;
      case 'ACTIVE':
        if (isOverdue) {
          return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Quá hạn</span>;
        }
        return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Đang mượn</span>;
      case 'RETURNED':
        return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Đã trả</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">Đã hủy</span>;
      case 'OVERDUE':
        return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">Quá hạn</span>;
      default:
        return <span className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">{status}</span>;
    }
  };

  const handleScanSubmit = () => {
    try {
      const data = JSON.parse(scanInput);
      if (data.borrow_ids && Array.isArray(data.borrow_ids)) {
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

  return (
    <div className="font-display relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden text-[#343A40] dark:text-gray-200">
      <div className="flex min-h-screen">
        <LibrarianSidebar activePage="BORROW" />
        
        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 w-full">
          <div className="w-full max-w-7xl mx-auto">
            {/* Page Heading */}
            <div className="flex flex-wrap justify-between gap-4 items-center mb-6">
              <div className="flex flex-col gap-1">
                <p className="text-slate-900 dark:text-slate-50 text-3xl font-bold leading-tight">
                  Quản lý Sách Mượn
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">
                  Theo dõi, quản lý và xem báo cáo về tình trạng sách trong thư viện.
                </p>
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
            <BorrowStatsCards stats={stats} />
            
            {/* Search & Filters */}
            <BorrowFilters
              search={search}
              statusFilter={statusFilter}
              onSearchChange={handleSearch}
              onStatusChange={setStatusFilter}
            />
            
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
                        <BorrowTableRow
                          key={record.id}
                          record={record}
                          onConfirmPickup={(id) => confirmPickupMutation.mutate(id)}
                          onReturn={(id) => returnBookMutation.mutate(id)}
                          getStatusBadge={getStatusBadge}
                        />
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
            
            <ScanQRModal
              isOpen={scanModalOpen}
              scanInput={scanInput}
              onClose={() => setScanModalOpen(false)}
              onInputChange={setScanInput}
              onSubmit={handleScanSubmit}
            />
          </div>
        </main>
      </div>
    </div>
  );
};
