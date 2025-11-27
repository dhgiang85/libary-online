import React, { useEffect } from 'react';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useNavigate } from 'react-router-dom';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ isOpen, onClose, onCheckout }) => {
  const { cart, isLoading, fetchCart, removeFromCart, clearCart } = useCartStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchCart();
    }
  }, [isOpen, fetchCart]);

  const handleRemove = async (bookId: string) => {
    try {
      await removeFromCart(bookId);
    } catch (error) {
      console.error('Failed to remove book:', error);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả sách trong giỏ?')) {
      try {
        await clearCart();
      } catch (error) {
        console.error('Failed to clear cart:', error);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-xl z-50 transform transition-transform">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Giỏ sách ({cart?.items?.length || 0})
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : cart?.items && cart.items.length > 0 ? (
              <div className="space-y-3">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors cursor-pointer group"
                    onClick={() => {
                      if (item.book?.id) {
                        navigate(`/books/${item.book.id}`);
                        onClose();
                      }
                    }}
                  >
                    {/* Book Cover */}
                    {item.book?.cover_url ? (
                      <img
                        src={item.book.cover_url}
                        alt={item.book.title || 'Book cover'}
                        className="w-16 h-20 object-cover rounded-md shadow-sm flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-20 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-2xl text-gray-400">book</span>
                      </div>
                    )}

                    {/* Book Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-2 mb-1">
                        {item.book?.title || `Book ID: ${item.book_id}`}
                      </h3>
                      {item.book?.authors && item.book.authors.length > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
                          {item.book.authors.map((a: any) => a.name).join(', ')}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        <span>{new Date(item.added_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                      {item.book?.available_copies !== undefined && (
                        <div className="mt-1">
                          {item.book.available_copies > 0 ? (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              {item.book.available_copies} bản sẵn sàng
                            </span>
                          ) : (
                            <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">error</span>
                              Hết sách
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(item.book_id);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      title="Xóa khỏi giỏ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <ShoppingBag className="h-16 w-16 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">
                  Giỏ sách của bạn đang trống
                </p>
                <button
                  onClick={() => {
                    navigate('/');
                    onClose();
                  }}
                  className="text-primary hover:underline"
                >
                  Khám phá sách ngay
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          {cart?.items && cart.items.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <button
                onClick={() => {
                  navigate('/cart');
                  onClose();
                }}
                className="w-full py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                Xem giỏ sách ({cart.items.length})
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
