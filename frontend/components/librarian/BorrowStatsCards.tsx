import React from 'react';

interface BorrowStats {
  active_borrows: number;
  overdue_books: number;
  pending_pickups: number;
  returned_today: number;
}

interface BorrowStatsCardsProps {
  stats?: BorrowStats;
}

export const BorrowStatsCards: React.FC<BorrowStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-slate-600 dark:text-slate-300 text-base font-medium leading-normal">
          Tổng sách đang mượn
        </p>
        <p className="text-slate-900 dark:text-slate-50 tracking-tight text-3xl font-bold leading-tight">
          {stats?.active_borrows || 0}
        </p>
        <p className="text-green-600 dark:text-green-500 text-sm font-medium leading-normal">
          Đang hoạt động
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-slate-600 dark:text-slate-300 text-base font-medium leading-normal">
          Sách quá hạn
        </p>
        <p className="text-slate-900 dark:text-slate-50 tracking-tight text-3xl font-bold leading-tight">
          {stats?.overdue_books || 0}
        </p>
        <p className="text-red-600 dark:text-red-500 text-sm font-medium leading-normal">
          Cần xử lý ngay
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-slate-600 dark:text-slate-300 text-base font-medium leading-normal">
          Chờ lấy sách
        </p>
        <p className="text-slate-900 dark:text-slate-50 tracking-tight text-3xl font-bold leading-tight">
          {stats?.pending_pickups || 0}
        </p>
        <p className="text-yellow-600 dark:text-yellow-500 text-sm font-medium leading-normal">
          Cần xác nhận
        </p>
      </div>
      <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <p className="text-slate-600 dark:text-slate-300 text-base font-medium leading-normal">
          Đã trả hôm nay
        </p>
        <p className="text-slate-900 dark:text-slate-50 tracking-tight text-3xl font-bold leading-tight">
          {stats?.returned_today || 0}
        </p>
        <p className="text-blue-600 dark:text-blue-500 text-sm font-medium leading-normal">
          Hoàn thành
        </p>
      </div>
    </div>
  );
};
