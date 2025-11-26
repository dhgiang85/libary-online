import React from 'react';
import { useCartStore } from '../../store/cartStore';
import { ShoppingCart } from 'lucide-react';

interface CartIconProps {
  onClick?: () => void;
}

export const CartIcon: React.FC<CartIconProps> = ({ onClick }) => {
  const itemCount = useCartStore(state => state.itemCount());

  return (
    <button
      onClick={onClick}
      className="relative flex items-center justify-center h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-700 text-neutral-800 dark:text-neutral-100 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
      aria-label="Shopping cart"
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 text-xs font-bold text-white bg-red-500 rounded-full">
          {itemCount > 9 ? '9+' : itemCount}
        </span>
      )}
    </button>
  );
};
