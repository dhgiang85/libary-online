import React, { useState } from 'react';
import { BookCopy, CopyStatus } from '../types';

interface CopyTableProps {
  copies: BookCopy[];
  onAddCopy: (barcode: string) => void;
  onDeleteCopy: (id: string) => void;
}

export const CopyTable: React.FC<CopyTableProps> = ({ copies, onAddCopy, onDeleteCopy }) => {
  const [newBarcode, setNewBarcode] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBarcode.trim()) {
      onAddCopy(newBarcode.trim());
      setNewBarcode('');
    }
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h4 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
          Danh sách các bản sao
        </h4>
        <form onSubmit={handleAdd} className="flex items-center gap-2 w-full sm:w-auto">
          <input
            className="w-full sm:w-auto rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-neutral-800 focus:border-brand-primary focus:ring-brand-primary text-sm py-2 px-3 outline-none border"
            placeholder="Nhập mã vạch..."
            type="text"
            value={newBarcode}
            onChange={(e) => setNewBarcode(e.target.value)}
          />
          <button
            type="submit"
            disabled={!newBarcode.trim()}
            className="px-4 py-2 rounded-lg text-sm font-bold bg-brand-primary text-white hover:bg-opacity-90 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-xl">add</span> Thêm bản sao
          </button>
        </form>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className="p-2 font-medium text-slate-600 dark:text-slate-300">Mã vạch</th>
              <th className="p-2 font-medium text-slate-600 dark:text-slate-300">Trạng thái</th>
              <th className="p-2 font-medium text-slate-600 dark:text-slate-300 text-right">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody>
            {copies.length === 0 && (
              <tr>
                <td colSpan={3} className="p-4 text-center text-slate-500">
                   Chưa có bản sao nào.
                </td>
              </tr>
            )}
            {copies.map((copy) => (
              <tr key={copy.id} className="border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <td className="p-2">{copy.barcode}</td>
                <td className="p-2">
                  {copy.status === CopyStatus.AVAILABLE ? (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      Có sẵn
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                      Đang mượn
                    </span>
                  )}
                </td>
                <td className="p-2 text-right">
                  {copy.status === CopyStatus.AVAILABLE ? (
                    <button
                      onClick={() => onDeleteCopy(copy.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Xóa bản sao"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="text-slate-400 dark:text-slate-500 cursor-not-allowed p-1 rounded-full"
                      title="Không thể xóa khi đang mượn"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};