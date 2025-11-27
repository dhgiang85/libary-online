import React from 'react';
import { BorrowStatus } from '../../api/borrowing';

interface BorrowFiltersProps {
  search: string;
  statusFilter: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusChange: (status: BorrowStatus | '') => void;
}

export const BorrowFilters: React.FC<BorrowFiltersProps> = ({
  search,
  statusFilter,
  onSearchChange,
  onStatusChange
}) => {
  return (
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
                onChange={onSearchChange}
              />
            </div>
          </label>
        </div>
        {/* Chips as Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${
              !statusFilter
                ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            onClick={() => onStatusChange('')}
          >
            <p className="text-sm font-medium leading-normal">Tất cả</p>
          </button>
          <button
            className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${
              statusFilter === BorrowStatus.PENDING
                ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            onClick={() => onStatusChange(BorrowStatus.PENDING)}
          >
            <p className="text-sm font-medium leading-normal">Chờ lấy</p>
          </button>
          <button
            className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${
              statusFilter === BorrowStatus.ACTIVE
                ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            onClick={() => onStatusChange(BorrowStatus.ACTIVE)}
          >
            <p className="text-sm font-medium leading-normal">Đang mượn</p>
          </button>
          <button
            className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-lg px-4 transition-colors ${
              statusFilter === BorrowStatus.RETURNED
                ? 'bg-primary/10 dark:bg-primary/20 text-primary'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            onClick={() => onStatusChange(BorrowStatus.RETURNED)}
          >
            <p className="text-sm font-medium leading-normal">Đã trả</p>
          </button>
        </div>
      </div>
    </div>
  );
};
