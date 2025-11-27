import React from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { BorrowRecord } from '../../api/borrowing';

interface BorrowTableRowProps {
  record: BorrowRecord;
  onConfirmPickup: (id: string) => void;
  onReturn: (id: string) => void;
  getStatusBadge: (status: string, dueDate: string) => JSX.Element;
}

export const BorrowTableRow: React.FC<BorrowTableRowProps> = ({
  record,
  onConfirmPickup,
  onReturn,
  getStatusBadge
}) => {
  // Debug: log status to see actual value
  console.log('Record status:', record.status, 'Type:', typeof record.status);
  
  return (
    <tr className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
        {record.book_title}
        <div className="text-xs text-gray-500 font-normal">{record.copy_barcode}</div>
      </td>
      <td className="px-6 py-4">
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 dark:text-white">
            {record.user_full_name || 'Unknown User'}
          </span>
          <span className="text-xs text-slate-500">{record.user_email}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        {format(new Date(record.borrowed_at), 'dd/MM/yyyy', { locale: vi })}
      </td>
      <td className="px-6 py-4">
        {format(new Date(record.due_date), 'dd/MM/yyyy', { locale: vi })}
      </td>
      <td className="px-6 py-4">
        {getStatusBadge(record.status, record.due_date)}
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          {record.status === 'PENDING' && (
            <button
              onClick={() => onConfirmPickup(record.id)}
              className="text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-xs font-medium transition-colors"
            >
              Xác nhận lấy
            </button>
          )}
          {(record.status === 'ACTIVE' || record.status === 'OVERDUE') && (
            <button
              onClick={() => onReturn(record.id)}
              className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-xs font-medium transition-colors"
            >
              Trả sách
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};
