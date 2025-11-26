import React, { useState } from 'react';
import { X, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { cart, checkout, isLoading } = useCartStore();
  const [dueDate, setDueDate] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const handleCheckout = async () => {
    setError('');
    setSuccess('');

    try {
      const dueDateObj = dueDate ? new Date(dueDate) : undefined;
      const result = await checkout(dueDateObj);

      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          onSuccess();
          onClose();
          // Reset form
          setDueDate('');
          setSuccess('');
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi mượn sách');
    }
  };

  // Get default due date (14 days from now)
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Modal */}
        <div
          className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Xác nhận mượn sách
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {success ? (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
                <p>{success}</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-gray-700 dark:text-gray-300 mb-2">
                    Bạn đang mượn <span className="font-bold">{cart?.items?.length || 0}</span> cuốn sách
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Vui lòng chọn ngày trả sách dự kiến
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Ngày trả sách
                  </label>
                  <input
                    type="date"
                    value={dueDate || getDefaultDueDate()}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Mặc định: 14 ngày kể từ hôm nay
                  </p>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!success && (
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                disabled={isLoading}
              >
                Hủy
              </button>
              <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Đang xử lý...' : 'Xác nhận mượn'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
