import React from 'react';

export const PublicFooter: React.FC = () => {
  return (
    <footer className="bg-gray-100 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-4">
          <div className="flex flex-col gap-2">
             <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="material-symbols-outlined text-primary text-xl">local_library</span>
                <h3 className="font-bold text-slate-900 dark:text-white">Thư Viện Tri Thức</h3>
             </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">© 2024 Thư Viện Tri Thức. All Rights Reserved.</p>
          </div>
          <div className="flex gap-6">
            <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors" href="#">FAQ</a>
            <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors" href="#">Liên hệ</a>
            <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors" href="#">Điều khoản Dịch vụ</a>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex gap-4">
                 <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors" href="#">Facebook</a>
                 <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors" href="#">Twitter</a>
                 <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-primary transition-colors" href="#">Instagram</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};