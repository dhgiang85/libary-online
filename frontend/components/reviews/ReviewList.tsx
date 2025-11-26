import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MoreVertical, Trash2, Edit2, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { reviewsApi } from '../../api/reviews';
import { useAuthStore } from '../../store/authStore';
import { RatingStars } from './RatingStars';
import { ReviewForm } from './ReviewForm';

interface ReviewListProps {
  bookId: string;
}

export const ReviewList: React.FC<ReviewListProps> = ({ bookId }) => {
  const { user, isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', bookId],
    queryFn: () => reviewsApi.getBookReviews(bookId, { page: 1, page_size: 10, sort_by: 'newest' }),
  });

  const { data: stats } = useQuery({
    queryKey: ['review-stats', bookId],
    queryFn: () => reviewsApi.getRatingStats(bookId),
  });

  const deleteMutation = useMutation({
    mutationFn: reviewsApi.deleteReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', bookId] });
      queryClient.invalidateQueries({ queryKey: ['books', bookId] });
      toast.success('Đã xóa đánh giá');
    },
  });

  // Check if current user already reviewed
  const userReview = reviews?.items.find(r => r.user_id === user?.id);
  const canWriteReview = isAuthenticated && !userReview;

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
      ))}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Rating Statistics */}
      {stats && stats.total_reviews > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Average Rating */}
            <div className="flex flex-col items-center justify-center md:border-r md:border-slate-200 dark:md:border-slate-700 md:pr-8">
              <div className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
                {stats.average_rating?.toFixed(1) || 'N/A'}
              </div>
              <RatingStars rating={stats.average_rating || 0} size={20} />
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                {stats.total_reviews} đánh giá
              </p>
            </div>

            {/* Rating Distribution */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.rating_distribution?.[star] || 0;
                const percentage = stats.total_reviews > 0 ? (count / stats.total_reviews) * 100 : 0;

                return (
                  <div key={star} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-12">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{star}</span>
                      <Star size={14} className="fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-400 w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Write Review Section */}
      {canWriteReview && (
        <div>
          {!showReviewForm ? (
            <button
              onClick={() => setShowReviewForm(true)}
              className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 text-slate-600 dark:text-slate-400 hover:text-primary font-medium"
            >
              <Star size={20} />
              Viết đánh giá của bạn
            </button>
          ) : (
            <ReviewForm
              bookId={bookId}
              onSuccess={() => {
                setShowReviewForm(false);
                queryClient.invalidateQueries({ queryKey: ['review-stats', bookId] });
              }}
              onCancel={() => setShowReviewForm(false)}
            />
          )}
        </div>
      )}

      {!isAuthenticated && (
        <div className="text-center py-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-slate-600 dark:text-slate-400">
            Vui lòng <span className="text-primary font-medium">đăng nhập</span> để viết đánh giá
          </p>
        </div>
      )}

      {/* Reviews List */}
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
          Tất cả đánh giá ({reviews?.total || 0})
        </h3>

        {!reviews?.items.length ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            Chưa có đánh giá nào. Hãy là người đầu tiên đánh giá cuốn sách này!
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.items.map((review) => (
              <div key={review.id} className="border-b border-gray-100 dark:border-gray-700 pb-6 last:border-0">
                {editingReviewId === review.id ? (
                  <ReviewForm
                    bookId={bookId}
                    reviewId={review.id}
                    initialData={{ rating: review.rating, review_text: review.review_text || '' }}
                    onSuccess={() => setEditingReviewId(null)}
                    onCancel={() => setEditingReviewId(null)}
                  />
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {(review.user_full_name || review.user_username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {review.user_full_name || review.user_username}
                          </p>
                          <div className="flex items-center gap-2">
                            <RatingStars rating={review.rating} size={14} />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: vi })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {user?.id === review.user_id && (
                        <div className="relative group">
                          <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <MoreVertical size={16} />
                          </button>
                          <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 hidden group-hover:block z-10">
                            <button
                              onClick={() => setEditingReviewId(review.id)}
                              className="w-full text-left px-4 py-2 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Edit2 size={12} /> Sửa
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Bạn có chắc muốn xóa đánh giá này?')) {
                                  deleteMutation.mutate(review.id);
                                }
                              }}
                              className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <Trash2 size={12} /> Xóa
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {review.review_text && (
                      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mt-2">
                        {review.review_text}
                      </p>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
