
import React, { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BasicInfo } from '../types';
import api from '../api/axios';

interface StepBasicInfoProps {
  data: BasicInfo;
  onChange: (data: BasicInfo) => void;
  onFileChange?: (file: File) => void;
}

export const StepBasicInfo: React.FC<StepBasicInfoProps> = ({ data, onChange, onFileChange }) => {
  const [authorInput, setAuthorInput] = useState('');
  const [showAuthorSuggestions, setShowAuthorSuggestions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch authors for autocomplete
  const { data: authorsData, isLoading: isLoadingAuthors } = useQuery({
    queryKey: ['authors', 'all'],
    queryFn: async () => {
      const response = await api.get('/authors');
      return response.data;
    },
  });

  const handleChange = (field: keyof BasicInfo, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (onFileChange) {
        onFileChange(file);
      }
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      onChange({ ...data, coverUrl: previewUrl });
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const addAuthor = (value: string) => {
    if (value.trim()) {
      onChange({
        ...data,
        authors: [...data.authors, value.trim()],
      });
      setAuthorInput('');
    }
  };

  const removeAuthor = (index: number) => {
    const newAuthors = [...data.authors];
    newAuthors.splice(index, 1);
    onChange({
      ...data,
      authors: newAuthors,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addAuthor(authorInput);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-sm">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            Bước 1: Thông tin cơ bản
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Cập nhật thông tin chính của sách.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1">
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
              Ảnh bìa
            </label>
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-full aspect-[2/3] bg-slate-100 dark:bg-slate-700 rounded-lg overflow-hidden shadow-sm">
                {data.coverUrl ? (
                  <img
                    className="w-full h-full object-cover"
                    src={data.coverUrl}
                    alt="Book cover"
                  />
                ) : (
                  <div className="flex items-center justify-center w-full h-full text-slate-400">
                    <span className="material-symbols-outlined text-4xl">image</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
              />
              <button 
                onClick={triggerFileSelect}
                className="w-full text-center text-sm font-medium bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-neutral-800 dark:text-neutral-100 px-4 py-2 rounded-lg transition-colors"
              >
                Thay đổi ảnh
              </button>
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2" htmlFor="book-title">
                Tiêu đề sách
              </label>
              <input
                className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-neutral-800 focus:border-brand-primary focus:ring-brand-primary p-2.5 border outline-none transition-all"
                id="book-title"
                type="text"
                value={data.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Tác giả
              </label>
              <div className="relative">
                <div className="flex flex-wrap gap-2 p-2 border border-slate-300 dark:border-slate-600 rounded-lg min-h-[42px] bg-white dark:bg-neutral-800 focus-within:ring-1 focus-within:ring-brand-primary focus-within:border-brand-primary">
                  {data.authors.map((author, index) => (
                    <span
                      key={index}
                      className="flex items-center gap-2 bg-brand-primary/10 text-brand-primary dark:text-blue-200 text-sm font-medium px-2 py-1 rounded-full"
                    >
                      {author}
                      <button
                        onClick={() => removeAuthor(index)}
                        className="text-brand-primary/70 dark:text-blue-200/70 hover:text-brand-primary dark:hover:text-blue-200 rounded-full hover:bg-brand-primary/20 p-0.5"
                      >
                        <span className="material-symbols-outlined text-base leading-none">close</span>
                      </button>
                    </span>
                  ))}
                  <input
                    className="flex-1 border-none bg-transparent focus:ring-0 text-sm p-1 outline-none min-w-[120px]"
                    placeholder={data.authors.length === 0 ? "Tìm tác giả..." : ""}
                    type="text"
                    value={authorInput}
                    onChange={(e) => {
                      setAuthorInput(e.target.value);
                      setShowAuthorSuggestions(true);
                    }}
                    onFocus={() => setShowAuthorSuggestions(true)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                
                {/* Author Suggestions */}
                {showAuthorSuggestions && authorInput && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {isLoadingAuthors ? (
                      <div className="p-2 text-sm text-slate-500 text-center">Đang tải...</div>
                    ) : authorsData?.filter(a => !data.authors.includes(a.name)).length === 0 ? (
                      <div className="p-2 text-sm text-slate-500 text-center">
                        Không tìm thấy tác giả. Nhấn Enter để thêm mới.
                      </div>
                    ) : (
                      authorsData
                        ?.filter(a => a.name.toLowerCase().includes(authorInput.toLowerCase()) && !data.authors.includes(a.name))
                        .map((author) => (
                          <button
                            key={author.id}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                            onClick={() => {
                              addAuthor(author.name);
                              setShowAuthorSuggestions(false);
                            }}
                          >
                            {author.name}
                          </button>
                        ))
                    )}
                  </div>
                )}
                {/* Overlay to close suggestions */}
                {showAuthorSuggestions && (
                  <div 
                    className="fixed inset-0 z-0" 
                    onClick={() => setShowAuthorSuggestions(false)}
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2" htmlFor="book-description">
                Mô tả sách
              </label>
              <textarea
                className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-neutral-800 focus:border-brand-primary focus:ring-brand-primary p-2.5 border outline-none transition-all"
                id="book-description"
                rows={6}
                value={data.description}
                onChange={(e) => handleChange('description', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
