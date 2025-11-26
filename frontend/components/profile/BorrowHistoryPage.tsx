import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { borrowingApi, BorrowStatus, BorrowRecord } from '../../api/borrowing';
import { PublicHeader } from '../PublicHeader';
import { PublicFooter } from '../PublicFooter';
import { Calendar, Clock, BookOpen, AlertCircle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

export const BorrowHistoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  const { data: history, isLoading } = useQuery({
    queryKey: ['borrow-history'],
    queryFn: () => borrowingApi.getMyHistory(),
  });

  const currentBorrows = history?.filter(
    (r) => r.status === BorrowStatus.ACTIVE || r.status === BorrowStatus.PENDING || r.status === BorrowStatus.OVERDUE
  ) || [];

  const pastBorrows = history?.filter(
    (r) => r.status === BorrowStatus.RETURNED
  ) || [];

  const getStatusBadge = (status: BorrowStatus) => {
    switch (status) {
      case BorrowStatus.PENDING:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 dark:bg-yellow-900/40 px-3 py-1 text-xs font-medium text-yellow-800 dark:text-yellow-300">
            <Clock className="h-3 w-3" />
            Chờ lấy sách
          </span>
        );
      case BorrowStatus.ACTIVE:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900/40 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300">
            <BookOpen className="h-3 w-3" />
            Đang mượn
          </span>
        );
      case BorrowStatus.OVERDUE:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-900/40 px-3 py-1 text-xs font-medium text-red-700 dark:text-red-300">
            <AlertCircle className="h-3 w-3" />
            Quá hạn
          </span>
        );
      case BorrowStatus.RETURNED:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-medium text-gray-600 dark:text-gray-400">
            <CheckCircle className="h-3 w-3" />
            Đã trả
          </span>
        );
      default:
        return null;
    }
  };

  const getImageUrl = (url: string | null) => {
    if (!url) return 'https://via.placeholder.com/300x400?text=No+Cover';
    if (url.startsWith('http')) return url;
    const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const baseUrl = apiUrl.replace('/api/v1', '');
    return `${baseUrl}${url}`;
  };

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedQrData, setSelectedQrData] = useState<string>('');

  const handleShowQr = (borrowId: string) => {
    // Format matches the checkout QR code: {"borrow_ids": ["id1", "id2"]}
    const data = JSON.stringify({ borrow_ids: [borrowId] });
    setSelectedQrData(data);
    setQrModalOpen(true);
  };

  const QrModal = () => {
    const [qrUrl, setQrUrl] = useState('');
    
    React.useEffect(() => {
      if (selectedQrData) {
        import('qrcode').then(QRCode => {
          QRCode.toDataURL(selectedQrData, { width: 300, margin: 2 })
            .then(url => setQrUrl(url))
            .catch(err => console.error(err));
        });
      }
    }, [selectedQrData]);

    if (!qrModalOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-sm w-full p-6 relative animate-in fade-in zoom-in duration-200">
          <button 
            onClick={() => setQrModalOpen(false)}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Mã QR Nhận Sách</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Vui lòng đưa mã này cho thủ thư để nhận sách
            </p>
            
            <div className="flex justify-center mb-6 bg-white p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              {qrUrl ? (
                <img src={qrUrl} alt="QR Code" className="w-48 h-48 object-contain" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400">
                  Đang tạo mã...
                </div>
              )}
            </div>
            
            <button
              onClick={() => setQrModalOpen(false)}
              className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  };

  const BorrowList = ({ records }: { records: BorrowRecord[] }) => {
    if (records.length === 0) {
      return (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Không có sách nào trong danh sách này</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {records.map((record) => (
          <div
            key={record.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm flex flex-col sm:flex-row gap-4 transition-all hover:shadow-md"
          >
            <img
              src={getImageUrl(record.book_cover)}
              alt={record.book_title}
              className="w-20 h-28 object-cover rounded-lg shadow-sm flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-1">
                    {record.book_title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {record.book_authors.join(', ')}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {getStatusBadge(record.status)}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>Mượn: {format(new Date(record.borrowed_at), 'dd/MM/yyyy', { locale: vi })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>Hạn trả: <span className="font-medium text-primary">{format(new Date(record.due_date), 'dd/MM/yyyy', { locale: vi })}</span></span>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <span className="font-medium">Phí cọc:</span>
                    <span>{record.deposit_fee.toLocaleString('vi-VN')}đ</span>
                  </div>
                  {record.returned_at && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Đã trả: {format(new Date(record.returned_at), 'dd/MM/yyyy', { locale: vi })}</span>
                    </div>
                  )}
                </div>
              </div>
              
              {record.status === BorrowStatus.PENDING && (
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-800 dark:text-yellow-200 flex-1">
                    Vui lòng đến thư viện để nhận sách.
                  </div>
                  <button
                    onClick={() => handleShowQr(record.id)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">qr_code</span>
                    Mã QR
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <QrModal />
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 font-display">
      <PublicHeader />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Lịch sử mượn sách</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Quản lý sách đang mượn và xem lại lịch sử trả sách của bạn
            </p>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex space-x-1 rounded-xl bg-gray-200 dark:bg-gray-800 p-1 w-fit">
              <button
                onClick={() => setActiveTab('current')}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-all
                  ${activeTab === 'current'
                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }
                `}
              >
                Đang mượn ({currentBorrows.length})
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`
                  px-4 py-2 text-sm font-medium rounded-lg transition-all
                  ${activeTab === 'history'
                    ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }
                `}
              >
                Lịch sử trả ({pastBorrows.length})
              </button>
            </div>

            {activeTab === 'current' && currentBorrows.some(r => r.status === BorrowStatus.PENDING) && (
              <button
                onClick={() => {
                  const pendingIds = currentBorrows
                    .filter(r => r.status === BorrowStatus.PENDING)
                    .map(r => r.id);
                  const data = JSON.stringify({ borrow_ids: pendingIds });
                  setSelectedQrData(data);
                  setQrModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined">qr_code_scanner</span>
                <span className="font-medium">Mã QR nhận tất cả ({currentBorrows.filter(r => r.status === BorrowStatus.PENDING).length})</span>
              </button>
            )}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <BorrowList records={activeTab === 'current' ? currentBorrows : pastBorrows} />
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
};
