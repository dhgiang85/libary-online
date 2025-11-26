import React from 'react';
import { BookStats } from '../types';

interface StatsGridProps {
  stats: BookStats;
}

export const StatsGrid: React.FC<StatsGridProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="flex flex-col gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Tổng số bản</p>
        <p className="text-3xl font-bold text-neutral-800 dark:text-neutral-100">{stats.total}</p>
      </div>
      <div className="flex flex-col gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Số bản có sẵn</p>
        <p className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.available}</p>
      </div>
      <div className="flex flex-col gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Số bản đang mượn</p>
        <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.borrowed}</p>
      </div>
    </div>
  );
};