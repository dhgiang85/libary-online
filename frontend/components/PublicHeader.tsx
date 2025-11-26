
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { LoginModal } from './auth/LoginModal';
import { RegisterModal } from './auth/RegisterModal';
import { UserMenu } from './auth/UserMenu';
import { CartIcon } from './cart/CartIcon';
import { CartDrawer } from './cart/CartDrawer';
import { CheckoutModal } from './cart/CheckoutModal';

interface PublicHeaderProps {
  activePage?: string;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({ activePage }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStore();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <div
                className="flex items-center gap-3 text-primary cursor-pointer"
                onClick={() => navigate('/')}
              >
                <span className="material-symbols-outlined text-3xl">local_library</span>
                <h1 className="text-[#0d141b] dark:text-white text-xl font-bold leading-tight tracking-[-0.015em]">Thư Viện</h1>
              </div>
              <nav className="hidden md:flex items-center gap-8">
                <a
                  className={`text-sm font-medium leading-normal hover:text-primary dark:hover:text-primary cursor-pointer transition-colors ${location.pathname === '/' ? 'text-primary' : 'text-[#0d141b] dark:text-gray-300'}`}
                  onClick={() => navigate('/')}
                >
                  Trang chủ
                </a>
                <a
                  className="text-[#0d141b] dark:text-gray-300 text-sm font-medium leading-normal hover:text-primary dark:hover:text-primary cursor-pointer transition-colors"
                  href="#"
                >
                  Danh mục
                </a>
                <a
                  className={`text-sm font-medium leading-normal hover:text-primary dark:hover:text-primary cursor-pointer transition-colors ${location.pathname.startsWith('/news') ? 'text-primary' : 'text-[#0d141b] dark:text-gray-300'}`}
                  onClick={() => navigate('/news')}
                >
                  Thông báo
                </a>
                {/* Only show Librarian link if user has permission */}
                {(user?.role === 'librarian' || user?.role === 'admin') && (
                  <a
                    className={`text-sm font-medium leading-normal hover:text-primary dark:hover:text-primary cursor-pointer transition-colors ${location.pathname.startsWith('/librarian') ? 'text-primary' : 'text-[#0d141b] dark:text-gray-300'}`}
                    onClick={() => navigate('/librarian')}
                  >
                    Thủ thư
                  </a>
                )}
              </nav>
            </div>
            <div className="flex flex-1 justify-center px-8">
              <div className="w-full max-w-md">
                <label className="relative text-gray-400 focus-within:text-gray-600 block">
                  <span className="material-symbols-outlined pointer-events-none absolute top-1/2 transform -translate-y-1/2 left-3">search</span>
                  <input 
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-full text-[#0d141b] dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 border-gray-300 dark:border-gray-700 bg-white/50 dark:bg-background-dark/50 h-10 placeholder:text-gray-400 dark:placeholder:text-gray-500 pl-10 text-sm font-normal leading-normal transition-all" 
                    placeholder="Tìm kiếm sách, tác giả, thể loại..." 
                    defaultValue=""
                  />
                </label>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex h-10 w-10 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-gray-200/80 dark:bg-gray-800/80 text-[#0d141b] dark:text-gray-300 hover:bg-primary/20 dark:hover:bg-primary/30 transition-colors">
                <span className="material-symbols-outlined text-xl">notifications</span>
              </button>
              
              {/* Cart Icon */}
              {isAuthenticated && (
                <CartIcon onClick={() => setIsCartOpen(true)} />
              )}
              
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setIsLoginOpen(true)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:text-primary transition-colors"
                  >
                    Đăng nhập
                  </button>
                  <button 
                    onClick={() => setIsRegisterOpen(true)}
                    className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-full hover:bg-primary/90 transition-colors shadow-sm"
                  >
                    Đăng ký
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
      />

      <RegisterModal 
        isOpen={isRegisterOpen} 
        onClose={() => setIsRegisterOpen(false)} 
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={() => {
          setIsCheckoutOpen(false);
          // Optionally show success message or navigate
        }}
      />
    </>
  );
};
