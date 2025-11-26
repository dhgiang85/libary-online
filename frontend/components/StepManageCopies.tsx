import React from 'react';
import { StatsGrid } from './StatsGrid';
import { CopyTable } from './CopyTable';
import { BookStats, BookCopy } from '../types';

interface StepManageCopiesProps {
  stats: BookStats;
  copies: BookCopy[];
  onAddCopy: (barcode: string) => void;
  onDeleteCopy: (id: string) => void;
}

export const StepManageCopies: React.FC<StepManageCopiesProps> = ({
  stats,
  copies,
  onAddCopy,
  onDeleteCopy,
}) => {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-sm">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            Bước 4: Quản lý bản sao
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Xem và điều chỉnh số lượng bản sao hiện có của sách.
          </p>
        </div>

        <StatsGrid stats={stats} />

        <CopyTable
          copies={copies}
          onAddCopy={onAddCopy}
          onDeleteCopy={onDeleteCopy}
        />
      </div>
    </div>
  );
};
