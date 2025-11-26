import React from 'react';
import { Star } from 'lucide-react';

interface RatingStarsProps {
  rating: number;
  maxRating?: number;
  size?: number;
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
  rating,
  maxRating = 5,
  size = 16,
  interactive = false,
  onRatingChange,
}) => {
  const [hoverRating, setHoverRating] = React.useState<number | null>(null);

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: maxRating }).map((_, index) => {
        const starValue = index + 1;
        const isFilled = (hoverRating !== null ? hoverRating : rating) >= starValue;
        
        return (
          <Star
            key={index}
            size={size}
            className={`
              ${interactive ? 'cursor-pointer transition-colors' : ''}
              ${isFilled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}
            `}
            onMouseEnter={() => interactive && setHoverRating(starValue)}
            onMouseLeave={() => interactive && setHoverRating(null)}
            onClick={() => interactive && onRatingChange?.(starValue)}
          />
        );
      })}
    </div>
  );
};
