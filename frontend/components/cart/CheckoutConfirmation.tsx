import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { PublicHeader } from '../PublicHeader';
import { PublicFooter } from '../PublicFooter';
import { CheckCircle, Copy, Home, History } from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

import { useLocation } from 'react-router-dom';

export const CheckoutConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [borrowCode, setBorrowCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [borrowedBooks, setBorrowedBooks] = useState<any[]>([]);
  const [holdUntil, setHoldUntil] = useState('');

  useEffect(() => {
    const state = location.state as { borrow_records?: any[] };
    
    if (!state?.borrow_records || state.borrow_records.length === 0) {
      toast.error('Không tìm thấy thông tin mượn sách');
      navigate('/cart');
      return;
    }

    const records = state.borrow_records;
    
    // Extract books from records (assuming record has book details or we need to map)
    // The backend returns BorrowRecordResponse which has 'book' field (BookResponse)
    // Let's check the structure. BorrowRecordResponse usually has book details if eager loaded.
    // In cartStore.checkout, we return result.borrow_records.
    
    // We need to map records to books for display
    // If book details are not in record, we might need to fetch or use what we have.
    // The previous implementation fetched cart to get books.
    // But now cart is empty.
    // We should rely on the response from checkout which should contain book details.
    
    // Let's assume record.book is populated.
    const books = records.map(r => r.book || { title: r.book_title || 'Unknown', authors: [] });
    setBorrowedBooks(books);

    // Generate borrow code
    const code = generateBorrowCode();
    setBorrowCode(code);

    // Generate QR code
    const generateQR = async () => {
      const qrData = JSON.stringify({
        borrow_ids: records.map(r => r.id)
      });
      
      try {
        const qrUrl = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 2,
        });
        setQrCodeUrl(qrUrl);
      } catch (e) {
        console.error('Failed to generate QR', e);
      }
    };
    generateQR();

    // Calculate hold until date (3 days from now)
    const holdDate = new Date();
    holdDate.setDate(holdDate.getDate() + 3);
    setHoldUntil(holdDate.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }));

  }, [location.state, navigate]);

  const generateBorrowCode = () => {
    // Generate format: XXXX-XXXX-XXXX
    const part1 = Math.floor(1000 + Math.random() * 9000);
    const part2 = Math.floor(1000 + Math.random() * 9000);
    const part3 = Math.floor(1000 + Math.random() * 9000);
    return `${part1}-${part2}-${part3}`;
  };

  // Removed handleCheckout as it's no longer needed

  const copyCode = () => {
    navigator.clipboard.writeText(borrowCode);
    toast.success('Đã sao chép mã');
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return 'https://via.placeholder.com/300x400?text=No+Cover';
    if (url.startsWith('http')) return url;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const baseUrl = apiUrl.replace('/api/v1', '');
    return `${baseUrl}${url}`;
  };



  return (
    <div className="font-display bg-background-light dark:bg-background-dark min-h-screen">
      <PublicHeader />
      
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-4xl rounded-xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 p-6 sm:p-8 md:p-12">
          {/* Header Section */}
          <div className="text-center mb-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <h1 className="text-[#0d141b] dark:text-slate-100 tracking-light text-3xl font-bold leading-tight">
              Mượn sách thành công!
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-base font-normal leading-normal mt-2">
              Yêu cầu mượn sách của bạn đã được xác nhận.
            </p>
          </div>

          {/* Main Content: QR and Instructions */}
          <div className="flex flex-col md:flex-row gap-8 mb-8">
            {/* QR Code Section */}
            <div className="flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-800 rounded-lg md:w-1/3">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 mb-4" />
              )}
              <h2 className="text-[#0d141b] dark:text-slate-200 text-lg font-bold leading-tight tracking-[-0.015em] pt-4">
                Mã số mượn:
              </h2>
              <p className="text-slate-800 dark:text-slate-100 font-mono text-xl tracking-wider">
                {borrowCode}
              </p>
              <div className="mt-4">
                <button
                  onClick={copyCode}
                  className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 gap-2 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  <span className="truncate">Sao chép mã</span>
                </button>
              </div>
            </div>

            {/* Instructions and Hold Period */}
            <div className="flex flex-col gap-4 md:w-2/3">
              <div className="bg-blue-50 dark:bg-blue-900/40 border-l-4 border-primary p-4 rounded-r-lg">
                <h3 className="font-bold text-primary dark:text-blue-300">Hướng dẫn nhận sách</h3>
                <p className="text-slate-700 dark:text-slate-300 text-base font-normal leading-normal mt-1">
                  Vui lòng đưa mã QR hoặc mã số mượn này cho thủ thư để nhận sách của bạn.
                </p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/40 border-l-4 border-amber-500 p-4 rounded-r-lg">
                <h3 className="font-bold text-amber-800 dark:text-amber-300">Thời gian giữ sách</h3>
                <p className="text-slate-700 dark:text-slate-300 text-base font-normal leading-normal mt-1">
                  Vui lòng nhận sách trước <span className="font-semibold">{holdUntil}</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Books Table */}
          <div className="mb-8">
            <h3 className="text-xl font-bold text-[#0d141b] dark:text-slate-100 mb-4">
              Chi tiết sách đã mượn
            </h3>
            <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs uppercase text-slate-700 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-3 w-24" scope="col">Ảnh bìa</th>
                    <th className="px-6 py-3" scope="col">Tên sách</th>
                    <th className="px-6 py-3" scope="col">Tác giả</th>
                  </tr>
                </thead>
                <tbody>
                  {borrowedBooks.map((book, index) => (
                    <tr
                      key={index}
                      className={`bg-white dark:bg-slate-900 ${
                        index < borrowedBooks.length - 1 ? 'border-b dark:border-slate-800' : ''
                      }`}
                    >
                      <td className="p-4">
                        <div
                          className="w-12 h-16 bg-center bg-no-repeat bg-cover rounded"
                          style={{ backgroundImage: `url("${getImageUrl(book?.cover_url)}")` }}
                        />
                      </td>
                      <th
                        className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap"
                        scope="row"
                      >
                        {book?.title || 'Unknown'}
                      </th>
                      <td className="px-6 py-4">
                        {book?.authors?.map((a: any) => a.name).join(', ') || 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-11 px-6 bg-primary text-white gap-2 text-base font-bold leading-normal tracking-[0.015em] hover:bg-primary/90 transition-colors"
            >
              <Home className="h-5 w-5" />
              <span className="truncate">Về trang chủ</span>
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="w-full sm:w-auto flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-11 px-6 bg-transparent text-[#0d141b] dark:text-slate-300 border border-slate-300 dark:border-slate-700 gap-2 text-base font-bold leading-normal tracking-[0.015em] hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <History className="h-5 w-5" />
              <span className="truncate">Xem lịch sử mượn</span>
            </button>
          </div>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
};
