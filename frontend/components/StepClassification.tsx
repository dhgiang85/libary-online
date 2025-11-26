import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClassificationDetails } from '../types';
import api from '../api/axios';

interface StepClassificationProps {
  data: ClassificationDetails;
  onChange: (data: ClassificationDetails) => void;
}

export const StepClassification: React.FC<StepClassificationProps> = ({ data, onChange }) => {
  const [genreInput, setGenreInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [showGenreSuggestions, setShowGenreSuggestions] = useState(false);

  // Fetch genres for autocomplete
  const { data: genresData, isLoading: isLoadingGenres } = useQuery({
    queryKey: ['genres', 'all'],
    queryFn: async () => {
      const response = await api.get('/genres/all');
      return response.data;
    },
  });

  const handleLocationChange = (field: keyof ClassificationDetails['location'], value: string) => {
    onChange({
      ...data,
      location: {
        ...data.location,
        [field]: value,
      },
    });
  };

  const addTag = (
    field: 'genres' | 'keywords', 
    value: string, 
    setValue: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (value.trim()) {
      onChange({
        ...data,
        [field]: [...data[field], value.trim()],
      });
      setValue('');
    }
  };

  const removeTag = (field: 'genres' | 'keywords', index: number) => {
    const newTags = [...data[field]];
    newTags.splice(index, 1);
    onChange({
      ...data,
      [field]: newTags,
    });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>, 
    field: 'genres' | 'keywords',
    value: string,
    setValue: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(field, value, setValue);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-sm">
      <div className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            Bước 3: Phân loại &amp; Sắp xếp
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Thêm thể loại, từ khóa và chỉ định vị trí của sách trong thư viện.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6">
          {/* Genres */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2" htmlFor="genres">
              Thể loại
            </label>
            <div className="relative">
              <div className="flex flex-wrap gap-2 p-2 border border-slate-300 dark:border-slate-600 rounded-lg min-h-[42px] bg-white dark:bg-neutral-800 focus-within:ring-1 focus-within:ring-brand-primary focus-within:border-brand-primary">
                {data.genres.map((genre, index) => (
                  <span key={index} className="flex items-center gap-2 bg-brand-primary/10 text-brand-primary dark:text-blue-200 text-sm font-medium px-2 py-1 rounded-full">
                    {genre}
                    <button 
                      onClick={() => removeTag('genres', index)}
                      className="text-brand-primary/70 dark:text-blue-200/70 hover:text-brand-primary dark:hover:text-blue-200 rounded-full hover:bg-brand-primary/20 p-0.5"
                    >
                      <span className="material-symbols-outlined text-base leading-none">close</span>
                    </button>
                  </span>
                ))}
                <input
                  className="flex-1 border-none bg-transparent focus:ring-0 text-sm p-1 outline-none min-w-[120px]"
                  placeholder={data.genres.length === 0 ? "Chọn thể loại..." : ""}
                  type="text"
                  value={genreInput}
                  onChange={(e) => {
                    setGenreInput(e.target.value);
                    setShowGenreSuggestions(true);
                  }}
                  onFocus={() => setShowGenreSuggestions(true)}
                  onKeyDown={(e) => handleKeyDown(e, 'genres', genreInput, setGenreInput)}
                />
              </div>

              {/* Genre Suggestions */}
              {showGenreSuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {isLoadingGenres ? (
                    <div className="p-2 text-sm text-slate-500 text-center">Đang tải...</div>
                  ) : (
                    genresData
                      ?.filter((g: any) => 
                        g.name.toLowerCase().includes(genreInput.toLowerCase()) && 
                        !data.genres.includes(g.name)
                      )
                      .map((genre: any) => (
                        <button
                          key={genre.id}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
                          onClick={() => {
                            addTag('genres', genre.name, setGenreInput);
                            setShowGenreSuggestions(false);
                          }}
                        >
                          {genre.name}
                        </button>
                      ))
                  )}
                  {!isLoadingGenres && genresData?.filter((g: any) => g.name.toLowerCase().includes(genreInput.toLowerCase())).length === 0 && (
                     <div className="p-2 text-sm text-slate-500 text-center">
                       Không tìm thấy thể loại. Nhấn Enter để thêm mới.
                     </div>
                  )}
                </div>
              )}
              {/* Overlay to close suggestions */}
              {showGenreSuggestions && (
                <div 
                  className="fixed inset-0 z-0" 
                  onClick={() => setShowGenreSuggestions(false)}
                />
              )}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
              Vị trí trong thư viện
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1" htmlFor="floor">
                  Tầng
                </label>
                <input
                  className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-neutral-800 focus:border-brand-primary focus:ring-brand-primary p-2.5 border outline-none"
                  id="floor"
                  type="text"
                  value={data.location.floor}
                  onChange={(e) => handleLocationChange('floor', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1" htmlFor="shelf">
                  Kệ số
                </label>
                <input
                  className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-neutral-800 focus:border-brand-primary focus:ring-brand-primary p-2.5 border outline-none"
                  id="shelf"
                  type="text"
                  value={data.location.shelf}
                  onChange={(e) => handleLocationChange('shelf', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1" htmlFor="row">
                  Hàng
                </label>
                <input
                  className="w-full rounded-lg border-slate-300 dark:border-slate-600 bg-white dark:bg-neutral-800 focus:border-brand-primary focus:ring-brand-primary p-2.5 border outline-none"
                  id="row"
                  type="text"
                  value={data.location.row}
                  onChange={(e) => handleLocationChange('row', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2" htmlFor="keywords">
              Từ khóa / Chủ đề
            </label>
            <div className="relative">
              <div className="flex flex-wrap gap-2 p-2 border border-slate-300 dark:border-slate-600 rounded-lg min-h-[42px] bg-white dark:bg-neutral-800 focus-within:ring-1 focus-within:ring-brand-primary focus-within:border-brand-primary">
                {data.keywords.map((keyword, index) => (
                  <span key={index} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium px-2 py-1 rounded-full">
                    {keyword}
                    <button 
                      onClick={() => removeTag('keywords', index)}
                      className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 p-0.5"
                    >
                      <span className="material-symbols-outlined text-base leading-none">close</span>
                    </button>
                  </span>
                ))}
                <input
                  className="flex-1 border-none bg-transparent focus:ring-0 text-sm p-1 outline-none min-w-[120px]"
                  placeholder={data.keywords.length === 0 ? "Thêm từ khóa..." : ""}
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, 'keywords', keywordInput, setKeywordInput)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
