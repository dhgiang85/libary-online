
import React, { useState, useMemo, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './components/Home';
import { News } from './components/News';
import { NewsDetail } from './components/NewsDetail';
import { DashboardAnalytics } from './components/DashboardAnalytics';
import { LibrarianDashboard } from './components/LibrarianDashboard';
import { GenreManagement } from './components/librarian/GenreManagement';
import { AuthorManagement } from './components/librarian/AuthorManagement';
import { LibrarianNews } from './components/LibrarianNews';
import { LibrarianNewsCreate } from './components/LibrarianNewsCreate';
import { LibrarianNewsEdit } from './components/LibrarianNewsEdit';
import { LibrarianBooksManagement } from './components/LibrarianBooksManagement';
import { LibrarianMembers } from './components/LibrarianMembers';
import { LibrarianBorrowPage } from './components/LibrarianBorrowPage';
import { LibrarianAuthors } from './components/LibrarianAuthors';
import { Books } from './components/Books';
import { PublicHeader } from './components/PublicHeader';
import { PublicFooter } from './components/PublicFooter';
import { StepManageCopies } from './components/StepManageCopies';
import { StepPublicationDetails } from './components/StepPublicationDetails';
import { StepClassification } from './components/StepClassification';
import { StepBasicInfo } from './components/StepBasicInfo';
import { BookDetail } from './components/BookDetail';
import { AuthorDetail } from './components/AuthorDetail';
import { CartPage } from './components/cart/CartPage';
import { CheckoutConfirmation } from './components/cart/CheckoutConfirmation';
import { BorrowHistoryPage } from './components/profile/BorrowHistoryPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BookCopy, CopyStatus, BookStats, PublicationDetails, ClassificationDetails, BasicInfo } from './types';

const INITIAL_COPIES: BookCopy[] = [
  { id: '1', barcode: 'LIB00123A', status: CopyStatus.AVAILABLE },
  { id: '2', barcode: 'LIB00123B', status: CopyStatus.BORROWED },
  { id: '3', barcode: 'LIB00123C', status: CopyStatus.AVAILABLE },
  { id: '4', barcode: 'LIB00123D', status: CopyStatus.BORROWED },
];

const INITIAL_BASIC_INFO: BasicInfo = {
  title: "The Midnight Library",
  authors: ["Matt Haig"],
  description: "Somewhere out beyond the edge of the universe there is a library that contains an infinite number of books, each one the story of another reality.",
  coverUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBrW24jdVHH-jbpXnbQ2LgFDVzLBQ1Oro3M9e7RIi_b2N2dtQgbUqiokxcBOsLkRo5F92FRjLmKF_ofdUrzaeIj_hllqoNNLoS3cQqJ8ILma3JkLZbbMVjgQic1F4kb0M1KeQtY1SeUpvrrRjL-Z9fTJKg1RjZ3PCr4RK85kTFP-TGIMDwYK49pGF6Fh4TnIgx6uwZuL_8X7YVL_mY4ne_BV1XCrXy3Gs2VE7TWkPnoiPy0d3EIR2svpHpn9Vo8_nNU4kHfq-rynf0"
};

const INITIAL_PUB_DATA: PublicationDetails = {
  year: '2020',
  publisher: 'Viking Press',
  isbn: '978-0-525-55947-4',
  pages: '288'
};

const INITIAL_CLASS_DATA: ClassificationDetails = {
  genres: ['Fantasy', 'Contemporary', 'Fiction'],
  location: {
    floor: '3',
    shelf: '12B',
    row: '5'
  },
  keywords: ['Time Travel', 'Philosophy', 'Second Chances']
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  // State for each step
  const [basicInfo, setBasicInfo] = useState<BasicInfo>(INITIAL_BASIC_INFO);
  const [publicationData, setPublicationData] = useState<PublicationDetails>(INITIAL_PUB_DATA);
  const [classificationData, setClassificationData] = useState<ClassificationDetails>(INITIAL_CLASS_DATA);
  const [copies, setCopies] = useState<BookCopy[]>(INITIAL_COPIES);

  const stats: BookStats = useMemo(() => {
    return {
      total: copies.length,
      available: copies.filter((c) => c.status === CopyStatus.AVAILABLE).length,
      borrowed: copies.filter((c) => c.status === CopyStatus.BORROWED).length,
    };
  }, [copies]);

  const handleAddCopy = useCallback((barcode: string) => {
    const newCopy: BookCopy = {
      id: Date.now().toString(),
      barcode,
      status: CopyStatus.AVAILABLE,
    };
    setCopies((prev) => [...prev, newCopy]);
  }, []);

  const handleDeleteCopy = useCallback((id: string) => {
    setCopies((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    } else {
      // Navigate back to Librarian Dashboard instead of Home since this is an Admin/Librarian feature
      navigate('/librarian');
    }
  };

  const handleFinish = () => {
    console.log("Finished", { basicInfo, publicationData, classificationData, copies });
    alert("Cập nhật sách thành công!");
    navigate('/librarian');
  };

  const getStepLabel = (step: number) => {
    switch (step) {
      case 1: return "Thông tin cơ bản";
      case 2: return "Chi tiết xuất bản";
      case 3: return "Phân loại & Sắp xếp";
      case 4: return "Quản lý bản sao";
      default: return "";
    }
  };

  const getProgressWidth = (step: number) => {
    switch (step) {
      case 1: return "25%";
      case 2: return "50%";
      case 3: return "75%";
      case 4: return "100%";
      default: return "0%";
    }
  };

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/books" element={<Books />} />
      <Route path="/news" element={<News />} />
      <Route path="/news/:newsId" element={<NewsDetail />} />
      <Route path="/books/:bookId" element={<BookDetail />} />
      <Route path="/authors/:authorId" element={<AuthorDetail />} />
      <Route path="/cart" element={<CartPage />} />
      
      {/* Protected Routes for Authenticated Users */}
      <Route element={<ProtectedRoute />}>
        <Route path="/cart/checkout" element={<CheckoutConfirmation />} />
        <Route path="/profile/history" element={<BorrowHistoryPage />} />
      </Route>

      {/* Protected Routes for Librarians/Admins */}
      <Route element={<ProtectedRoute allowedRoles={['librarian', 'admin']} />}>
        <Route path="/librarian" element={<DashboardAnalytics />} />
        <Route path="/librarian/borrow" element={<LibrarianDashboard />} />
        <Route path="/librarian/genres" element={<GenreManagement />} />
        <Route path="/librarian/authors" element={<AuthorManagement />} />
        <Route path="/librarian/news" element={<LibrarianNews />} />
        <Route path="/librarian/news/create" element={<LibrarianNewsCreate />} />
        <Route path="/librarian/news/edit/:newsId" element={<LibrarianNewsEdit />} />
        <Route path="/librarian/books" element={<LibrarianBooksManagement />} />
        <Route path="/librarian/borrow" element={<LibrarianBorrowPage />} />
        <Route path="/librarian/authors" element={<LibrarianAuthors />} />
        <Route path="/librarian/members" element={<LibrarianMembers />} />
        <Route path="/librarian/books/edit/:bookId" element={<BookEditPage
          basicInfo={basicInfo}
          setBasicInfo={setBasicInfo}
          publicationData={publicationData}
          setPublicationData={setPublicationData}
          classificationData={classificationData}
          setClassificationData={setClassificationData}
          copies={copies}
          setCopies={setCopies}
          stats={stats}
          handleAddCopy={handleAddCopy}
          handleDeleteCopy={handleDeleteCopy}
          currentStep={currentStep}
          setCurrentStep={setCurrentStep}
          totalSteps={totalSteps}
          handleNext={handleNext}
          handleBack={handleBack}
          handleFinish={handleFinish}
          getStepLabel={getStepLabel}
          getProgressWidth={getProgressWidth}
        />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

// Book Edit Page Component
interface BookEditPageProps {
  basicInfo: BasicInfo;
  setBasicInfo: (info: BasicInfo) => void;
  publicationData: PublicationDetails;
  setPublicationData: (data: PublicationDetails) => void;
  classificationData: ClassificationDetails;
  setClassificationData: (data: ClassificationDetails) => void;
  copies: BookCopy[];
  setCopies: (copies: BookCopy[]) => void;
  stats: BookStats;
  handleAddCopy: (barcode: string) => void;
  handleDeleteCopy: (id: string) => void;
  currentStep: number;
  setCurrentStep: (step: number) => void;
  totalSteps: number;
  handleNext: () => void;
  handleBack: () => void;
  handleFinish: () => void;
  getStepLabel: (step: number) => string;
  getProgressWidth: (step: number) => string;
}

const BookEditPage: React.FC<BookEditPageProps> = ({
  basicInfo,
  setBasicInfo,
  publicationData,
  setPublicationData,
  classificationData,
  setClassificationData,
  copies,
  stats,
  handleAddCopy,
  handleDeleteCopy,
  currentStep,
  totalSteps,
  handleNext,
  handleBack,
  handleFinish,
  getStepLabel,
  getProgressWidth
}) => {
  const navigate = useNavigate();

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="layout-content-container flex flex-col max-w-4xl mx-auto flex-1 gap-8">
            
            {/* Breadcrumbs & Title */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <a
                  className="text-slate-500 dark:text-slate-400 font-medium leading-normal hover:underline cursor-pointer"
                  onClick={() => navigate('/')}
                >
                  Trang chủ
                </a>
                <span className="text-slate-500 dark:text-slate-400 font-medium leading-normal">
                  /
                </span>
                <a
                  className="text-slate-500 dark:text-slate-400 font-medium leading-normal hover:underline cursor-pointer"
                  onClick={() => navigate('/librarian')}
                >
                  Quản lý sách
                </a>
                <span className="text-slate-500 dark:text-slate-400 font-medium leading-normal">
                  /
                </span>
                <a className="text-slate-500 dark:text-slate-400 font-medium leading-normal hover:underline cursor-pointer" href="#">
                  The Midnight Library
                </a>
                <span className="text-slate-500 dark:text-slate-400 font-medium leading-normal">
                  /
                </span>
                <span className="text-neutral-800 dark:text-neutral-100 font-medium leading-normal">
                  Chỉnh sửa
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-neutral-800 dark:text-neutral-100 text-4xl font-black leading-tight tracking-[-0.033em]">
                  Chỉnh sửa sách
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-base">
                  The Midnight Library
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="flex flex-col gap-6">
              <div className="w-full">
                <div className="mb-2 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    Bước {currentStep} trên {totalSteps}
                  </span>
                  <span className="text-sm font-medium text-brand-primary dark:text-blue-300">
                    {getStepLabel(currentStep)}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div
                    className="bg-brand-primary h-2.5 rounded-full transition-all duration-500 ease-in-out"
                    style={{ width: getProgressWidth(currentStep) }}
                  ></div>
                </div>
              </div>

              {/* Step Content */}
              {currentStep === 1 && (
                <StepBasicInfo
                  data={basicInfo}
                  onChange={setBasicInfo}
                />
              )}

              {currentStep === 2 && (
                <StepPublicationDetails 
                  data={publicationData} 
                  onChange={setPublicationData} 
                />
              )}

              {currentStep === 3 && (
                <StepClassification 
                  data={classificationData} 
                  onChange={setClassificationData} 
                />
              )}

              {currentStep === 4 && (
                <StepManageCopies
                  stats={stats}
                  copies={copies}
                  onAddCopy={handleAddCopy}
                  onDeleteCopy={handleDeleteCopy}
                />
              )}
            </div>
          </div>
        </main>

        <Footer 
          currentStep={currentStep}
          totalSteps={totalSteps}
          onNext={handleNext}
          onBack={handleBack}
          onFinish={handleFinish}
        />
      </div>
    </div>
  );
};

export default App;