import React from 'react';
import { BookCopy } from '../types/models';
import { CopyTable } from './CopyTable';

export interface CopyManagementData {
  copies: BookCopy[];
  newBarcodes: string[];
  deletedCopyIds: string[];
}

interface StepCopyManagementProps {
  data: CopyManagementData;
  onChange: (data: CopyManagementData) => void;
  bookId?: string;
  isEditMode: boolean;
}

export const StepCopyManagement: React.FC<StepCopyManagementProps> = ({
  data,
  onChange,
  bookId,
  isEditMode,
}) => {
  const handleAddCopy = (barcode: string) => {
    // Check if barcode already exists
    const existingCopy = data.copies.find(c => c.barcode === barcode);
    const isDuplicate = existingCopy || data.newBarcodes.includes(barcode);

    if (isDuplicate) {
      alert('Mã vạch đã tồn tại!');
      return;
    }

    onChange({
      ...data,
      newBarcodes: [...data.newBarcodes, barcode],
    });
  };

  const handleDeleteCopy = (copyId: string) => {
    // Check if this is a new barcode or existing copy
    const isNewBarcode = data.newBarcodes.includes(copyId);

    if (isNewBarcode) {
      onChange({
        ...data,
        newBarcodes: data.newBarcodes.filter(b => b !== copyId),
      });
    } else {
      onChange({
        ...data,
        deletedCopyIds: [...data.deletedCopyIds, copyId],
      });
    }
  };

  // Filter out deleted copies from display
  const visibleCopies = data.copies.filter(
    c => !data.deletedCopyIds.includes(c.id)
  );

  // Create temporary copy objects for new barcodes
  const newCopiesDisplay: BookCopy[] = data.newBarcodes.map((barcode) => ({
    id: barcode, // Use barcode as temporary ID
    book_id: bookId || '',
    barcode: barcode,
    status: 'AVAILABLE' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  // Combine existing and new copies for display
  const allCopies = [...visibleCopies, ...newCopiesDisplay];

  const totalCopies = allCopies.length;
  const availableCopies = visibleCopies.filter(c => c.status === 'AVAILABLE').length + newCopiesDisplay.length;
  const borrowedCopies = visibleCopies.filter(c => c.status === 'BORROWED').length;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Quản lý bản sao
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Xem và điều chỉnh số lượng bản sao hiện có của sách.
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-600 dark:text-gray-400">Tổng số bản</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{totalCopies}</div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="text-sm font-medium text-green-600 dark:text-green-400">Số bản có sẵn</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">{availableCopies}</div>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <div className="text-sm font-medium text-orange-600 dark:text-orange-400">Số bản đang mượn</div>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-300 mt-1">{borrowedCopies}</div>
        </div>
      </div>

      {/* Copy Table */}
      <CopyTable
        copies={allCopies}
        onAddCopy={handleAddCopy}
        onDeleteCopy={handleDeleteCopy}
      />
    </div>
  );
};
