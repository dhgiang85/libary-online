import React from 'react';
import { PublicationDetails } from '../types';

interface StepPublicationDetailsProps {
  data: PublicationDetails;
  onChange: (data: PublicationDetails) => void;
  isEditMode?: boolean;
}

export const StepPublicationDetails: React.FC<StepPublicationDetailsProps> = ({ data, onChange, isEditMode }) => {
  const handleChange = (field: keyof PublicationDetails, value: string) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-sm">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            Bước 2: Chi tiết xuất bản
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cung cấp thông tin về nhà xuất bản và năm phát hành sách.
          </p>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2" htmlFor="publication-year">
              Năm xuất bản
            </label>
            <input
              className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-neutral-800 focus:border-brand-primary focus:ring-brand-primary p-2.5 border outline-none transition-all"
              id="publication-year"
              type="number"
              value={data.year}
              onChange={(e) => handleChange('year', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2" htmlFor="publisher">
              Nhà xuất bản
            </label>
            <input
              className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-neutral-800 focus:border-brand-primary focus:ring-brand-primary p-2.5 border outline-none transition-all"
              id="publisher"
              type="text"
              value={data.publisher}
              onChange={(e) => handleChange('publisher', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2" htmlFor="isbn">
              ISBN
            </label>
            <input
              className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-neutral-800 focus:border-brand-primary focus:ring-brand-primary p-2.5 border outline-none transition-all"
              id="isbn"
              type="text"
              value={data.isbn}
              onChange={(e) => handleChange('isbn', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2" htmlFor="page-count">
              Số trang
            </label>
            <input
              className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-neutral-800 focus:border-brand-primary focus:ring-brand-primary p-2.5 border outline-none transition-all"
              id="page-count"
              type="number"
              value={data.pages}
              onChange={(e) => handleChange('pages', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2" htmlFor="deposit-fee">
              Phí đặt cọc (VND)
            </label>
            <input
              className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-neutral-800 focus:border-brand-primary focus:ring-brand-primary p-2.5 border outline-none transition-all"
              id="deposit-fee"
              type="number"
              min="0"
              placeholder="Nhập phí đặt cọc (VD: 150000)"
              value={data.depositFee || ''}
              onChange={(e) => handleChange('depositFee', e.target.value)}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Số tiền người mượn cần đặt cọc khi mượn sách này
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2" htmlFor="initial-copies">
              Số lượng bản sao ban đầu {isEditMode && <span className="text-xs text-gray-400 font-normal">(Không thể thay đổi khi cập nhật)</span>}
            </label>
            <input
              className={`w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-neutral-800 focus:border-brand-primary focus:ring-brand-primary p-2.5 border outline-none transition-all ${isEditMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              id="initial-copies"
              type="number"
              min="0"
              placeholder={isEditMode ? "Quản lý bản sao ở phần khác" : "Nhập số lượng bản sao muốn tạo tự động (VD: 5)"}
              value={data.initialCopies || ''}
              onChange={(e) => handleChange('initialCopies', e.target.value)}
              disabled={isEditMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
