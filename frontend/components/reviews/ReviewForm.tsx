import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { RatingStars } from './RatingStars';
import { reviewsApi } from '../../api/reviews';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Vui lòng chọn số sao'),
  review_text: z.string().optional(),
});

type ReviewForm = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  bookId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialData?: ReviewForm;
  reviewId?: string;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ 
  bookId, 
  onSuccess, 
  onCancel,
  initialData,
  reviewId
}) => {
  const queryClient = useQueryClient();
  const isEditing = !!reviewId;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: initialData || { rating: 0, review_text: '' },
  });

  const rating = watch('rating');

  const mutation = useMutation({
    mutationFn: (data: ReviewForm) => {
      if (isEditing && reviewId) {
        return reviewsApi.updateReview(reviewId, data);
      }
      return reviewsApi.createReview(bookId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books', bookId] }); // Refresh book stats
      toast.success(isEditing ? 'Đã cập nhật đánh giá' : 'Đã gửi đánh giá');
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Có lỗi xảy ra');
    },
  });

  const onSubmit = (data: ReviewForm) => {
    mutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Đánh giá của bạn
        </label>
        <RatingStars 
          rating={rating} 
          interactive 
          size={24} 
          onRatingChange={(val) => setValue('rating', val)} 
        />
        {errors.rating && (
          <p className="text-red-500 text-xs mt-1">{errors.rating.message}</p>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Nhận xét (Tùy chọn)
        </label>
        <textarea
          {...register('review_text')}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
          placeholder="Chia sẻ cảm nghĩ của bạn về cuốn sách này..."
        />
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Hủy
          </button>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
        >
          {mutation.isPending ? 'Đang gửi...' : (isEditing ? 'Cập nhật' : 'Gửi đánh giá')}
        </button>
      </div>
    </form>
  );
};
