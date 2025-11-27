import React from 'react';

interface ScanQRModalProps {
  isOpen: boolean;
  scanInput: string;
  onClose: () => void;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
}

export const ScanQRModal: React.FC<ScanQRModalProps> = ({
  isOpen,
  scanInput,
  onClose,
  onInputChange,
  onSubmit
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
          Quét Mã QR
        </h3>

        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Nhập mã hoặc dán nội dung QR
          </label>
          <textarea
            value={scanInput}
            onChange={(e) => onInputChange(e.target.value)}
            className="w-full h-32 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            placeholder='{"borrow_ids": ["..."]}'
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onSubmit}
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
