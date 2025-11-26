import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { booksApi, CreateBookRequest } from '../../api/books';
import { copiesApi } from '../../api/copies';
import { BasicInfo, PublicationDetails, ClassificationDetails } from '../../types';
import { Book } from '../../types/models';
import { StepBasicInfo } from '../StepBasicInfo';
import { StepPublicationDetails } from '../StepPublicationDetails';
import { StepClassification } from '../StepClassification';
import { StepCopyManagement, CopyManagementData } from '../StepCopyManagement';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: Book;
}

const INITIAL_BASIC_INFO: BasicInfo = {
  title: '',
  authors: [],
  description: '',
  coverUrl: '',
};

const INITIAL_PUBLICATION_DETAILS: PublicationDetails = {
  year: '',
  publisher: '',
  isbn: '',
  pages: '',
  initialCopies: '',
};

const INITIAL_CLASSIFICATION: ClassificationDetails = {
  genres: [],
  location: {
    floor: '',
    shelf: '',
    row: '',
  },
  keywords: [],
};

const INITIAL_COPY_MANAGEMENT: CopyManagementData = {
  copies: [],
  newBarcodes: [],
  deletedCopyIds: [],
};

export const AddBookModal: React.FC<AddBookModalProps> = ({ isOpen, onClose, initialData }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [basicInfo, setBasicInfo] = useState<BasicInfo>(INITIAL_BASIC_INFO);
  const [publicationDetails, setPublicationDetails] = useState<PublicationDetails>(INITIAL_PUBLICATION_DETAILS);
  const [classification, setClassification] = useState<ClassificationDetails>(INITIAL_CLASSIFICATION);
  const [copyManagement, setCopyManagement] = useState<CopyManagementData>(INITIAL_COPY_MANAGEMENT);
  const [coverFile, setCoverFile] = useState<File | undefined>(undefined);

  const isEditMode = !!initialData;
  const queryClient = useQueryClient();

  // Fetch existing copies when in edit mode
  const { data: existingCopies } = useQuery({
    queryKey: ['book-copies', initialData?.id],
    queryFn: () => copiesApi.getCopiesByBookId(initialData!.id),
    enabled: isEditMode && !!initialData?.id && isOpen,
  });

  // Helper to get full image URL
  const getImageUrl = (url: string | null) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    const baseUrl = apiUrl.replace('/api/v1', '');
    return `${baseUrl}${url}`;
  };

  useEffect(() => {
    if (initialData && isOpen) {
      setBasicInfo({
        title: initialData.title,
        authors: initialData.authors.map(a => a.name),
        description: initialData.description || '',
        coverUrl: getImageUrl(initialData.cover_url),
      });
      setPublicationDetails({
        year: initialData.publication_year?.toString() || '',
        publisher: initialData.publisher || '',
        isbn: initialData.isbn || '',
        pages: initialData.pages?.toString() || '',
        depositFee: initialData.deposit_fee?.toString() || '',
        initialCopies: '', // Don't prefill copies for edit
      });
      setClassification({
        genres: initialData.genres.map(g => g.name),
        location: {
          floor: initialData.location.floor,
          shelf: initialData.location.shelf,
          row: initialData.location.row,
        },
        keywords: initialData.keywords.map(k => k.name),
      });
      setCoverFile(undefined);
    } else if (!isOpen) {
      // Reset form when closed
      setCurrentStep(1);
      setBasicInfo(INITIAL_BASIC_INFO);
      setPublicationDetails(INITIAL_PUBLICATION_DETAILS);
      setClassification(INITIAL_CLASSIFICATION);
      setCopyManagement(INITIAL_COPY_MANAGEMENT);
      setCoverFile(undefined);
    }
  }, [initialData, isOpen]);

  // Update copyManagement when existingCopies are loaded
  useEffect(() => {
    if (existingCopies && isEditMode) {
      setCopyManagement({
        copies: existingCopies,
        newBarcodes: [],
        deletedCopyIds: [],
      });
    }
  }, [existingCopies, isEditMode]);

  const createMutation = useMutation({
    mutationFn: (data: { request: CreateBookRequest; file?: File }) => 
      booksApi.createBookWithUpload(data.request, data.file),
    onSuccess: () => {
      toast.success('Thêm sách thành công!');
      queryClient.invalidateQueries({ queryKey: ['books'] });
      handleClose();
    },
    onError: (error: any) => {
      console.error('Failed to create book:', error);
      const errorMessage = error.response?.data?.detail || 'Có lỗi xảy ra khi thêm sách';
      toast.error(errorMessage);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; request: CreateBookRequest; file?: File }) =>
      booksApi.updateBookWithUpload(data.id, data.request, data.file),
    onSuccess: async (_, variables) => {
      // Handle copy management after book update
      try {
        // Delete copies that were marked for deletion
        for (const copyId of copyManagement.deletedCopyIds) {
          await copiesApi.deleteCopy(copyId);
        }

        // Create new copies
        for (const barcode of copyManagement.newBarcodes) {
          await copiesApi.createCopy({ book_id: variables.id, barcode });
        }

        toast.success('Cập nhật sách thành công!');
        queryClient.invalidateQueries({ queryKey: ['books'] });
        queryClient.invalidateQueries({ queryKey: ['book-copies'] });
        handleClose();
      } catch (error: any) {
        console.error('Failed to update copies:', error);
        toast.error('Cập nhật sách thành công nhưng có lỗi khi cập nhật bản sao');
        queryClient.invalidateQueries({ queryKey: ['books'] });
        handleClose();
      }
    },
    onError: (error: any) => {
      console.error('Failed to update book:', error);
      const errorMessage = error.response?.data?.detail || 'Có lỗi xảy ra khi cập nhật sách';
      toast.error(errorMessage);
    },
  });

  const handleClose = () => {
    onClose();
  };

  const totalSteps = isEditMode ? 4 : 3;

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(totalSteps, prev + 1));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!basicInfo.title.trim()) {
          toast.error('Vui lòng nhập tiêu đề sách');
          return false;
        }
        if (basicInfo.authors.length === 0) {
          toast.error('Vui lòng thêm ít nhất một tác giả');
          return false;
        }
        // In edit mode, cover is optional if already exists
        if (!isEditMode && !basicInfo.coverUrl && !coverFile) {
          toast.error('Vui lòng chọn ảnh bìa cho sách');
          return false;
        }
        return true;
      case 2:
        return true;
      case 3:
        return true;
      case 4:
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = () => {
    if (!validateStep(currentStep)) return;

    const requestData: CreateBookRequest = {
      title: basicInfo.title,
      description: basicInfo.description,
      isbn: publicationDetails.isbn || undefined,
      publisher: publicationDetails.publisher || undefined,
      publication_year: publicationDetails.year ? Number(publicationDetails.year) : undefined,
      pages: publicationDetails.pages ? Number(publicationDetails.pages) : undefined,
      deposit_fee: publicationDetails.depositFee ? Number(publicationDetails.depositFee) : undefined,
      floor: classification.location.floor || undefined,
      shelf: classification.location.shelf || undefined,
      row: classification.location.row || undefined,
      author_names: basicInfo.authors,
      genre_ids: classification.genres,
      keyword_names: classification.keywords,
      initial_copies: !isEditMode && publicationDetails.initialCopies ? Number(publicationDetails.initialCopies) : 0,
    };

    if (isEditMode && initialData) {
      updateMutation.mutate({ id: initialData.id, request: requestData, file: coverFile });
    } else {
      createMutation.mutate({ request: requestData, file: coverFile });
    }
  };

  if (!isOpen) return null;

  const getStepTitle = () => {
    if (isEditMode) {
      switch (currentStep) {
        case 1: return 'Thông tin cơ bản';
        case 2: return 'Chi tiết xuất bản';
        case 3: return 'Phân loại & Vị trí';
        case 4: return 'Quản lý bản sao';
        default: return '';
      }
    } else {
      switch (currentStep) {
        case 1: return 'Thông tin cơ bản';
        case 2: return 'Chi tiết xuất bản';
        case 3: return 'Phân loại & Vị trí';
        default: return '';
      }
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? 'Cập nhật sách' : 'Thêm sách mới'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Bước {currentStep}/{totalSteps}</span>
              <span className="text-primary font-medium">{getStepTitle()}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <StepBasicInfo 
              data={basicInfo} 
              onChange={setBasicInfo} 
              onFileChange={setCoverFile}
            />
          )}

          {currentStep === 2 && (
            <StepPublicationDetails 
              data={publicationDetails} 
              onChange={setPublicationDetails} 
              isEditMode={isEditMode}
            />
          )}

          {currentStep === 3 && (
            <StepClassification data={classification} onChange={setClassification} />
          )}

          {currentStep === 4 && isEditMode && (
            <StepCopyManagement
              data={copyManagement}
              onChange={setCopyManagement}
              bookId={initialData?.id}
              isEditMode={isEditMode}
            />
          )}

          {currentStep === 5 && isEditMode && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Xác nhận thông tin</h3>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Vui lòng kiểm tra lại thông tin trước khi {isEditMode ? 'cập nhật' : 'tạo'} sách
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-4">
                  {basicInfo.coverUrl && (
                    <img 
                      src={basicInfo.coverUrl} 
                      alt="Cover preview" 
                      className="w-24 h-36 object-cover rounded-md shadow-sm"
                    />
                  )}
                  <div className="space-y-2 flex-1">
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tiêu đề:</span>
                      <p className="text-gray-900 dark:text-white font-medium">{basicInfo.title}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tác giả:</span>
                      <p className="text-gray-900 dark:text-white">{basicInfo.authors.join(', ')}</p>
                    </div>
                  </div>
                </div>
                
                {basicInfo.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Mô tả:</span>
                    <p className="text-gray-900 dark:text-white line-clamp-3 text-sm">{basicInfo.description}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  {publicationDetails.isbn && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">ISBN:</span>
                      <p className="text-gray-900 dark:text-white">{publicationDetails.isbn}</p>
                    </div>
                  )}
                  {!isEditMode && publicationDetails.initialCopies && (
                    <div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Số lượng bản sao:</span>
                      <p className="text-gray-900 dark:text-white">{publicationDetails.initialCopies}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex justify-between">
            <button
              onClick={currentStep === 1 ? handleClose : handleBack}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {currentStep === 1 ? 'Hủy' : 'Quay lại'}
            </button>
            <button
              onClick={currentStep === totalSteps ? handleSubmit : handleNext}
              disabled={isPending}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isPending && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
              {isPending ? 'Đang xử lý...' : currentStep === totalSteps ? (isEditMode ? 'Lưu thay đổi' : 'Hoàn thành') : 'Tiếp theo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
