import { useState } from "react";

type StarRatingProps = {
  rating: number; // Rating from 0 to 5
  starSize?: number;
  gap?: number;
  color?: string; // Color for filled stars, defaults to white
  noStroke?: boolean; // Remove stroke/border from stars
  readOnly?: boolean; // If false, allows clicking to change rating
  onRatingChange?: (newRating: number) => void; // Callback when rating changes (receives value from 1-10)
};

export default function StarRating({ 
  rating, 
  starSize = 16, 
  gap = 4, 
  color = "#ffffff", 
  noStroke = false,
  readOnly = true,
  onRatingChange
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  
  const handleStarClick = (starValue: number, isHalf: boolean) => {
    if (!readOnly && onRatingChange) {
      // Convert from 0-5 scale to 1-10 scale
      // starValue is 1-5, if isHalf then subtract 0.5
      const ratingValue = isHalf ? starValue - 0.5 : starValue;
      const newRating = ratingValue * 2;
      onRatingChange(newRating);
    }
  };

  const handleStarHover = (starValue: number, isHalf: boolean) => {
    if (!readOnly) {
      const ratingValue = isHalf ? starValue - 0.5 : starValue;
      setHoverRating(ratingValue);
    }
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverRating(null);
    }
  };

  // Use hoverRating for preview if available, otherwise use actual rating
  const displayRating = hoverRating !== null ? hoverRating : rating;

  return (
    <div 
      style={{ display: 'flex', alignItems: 'center', gap: `${gap}px` }}
      onMouseLeave={handleMouseLeave}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = displayRating >= star;
        const halfFilled = displayRating >= star - 0.5 && displayRating < star;
        const starId = `star-${star}-${displayRating}`;
        
        return (
          <div 
            key={star} 
            style={{ 
              position: 'relative', 
              width: `${starSize}px`, 
              height: `${starSize}px`,
              cursor: readOnly ? 'default' : 'pointer'
            }}
          >
            {/* Background star (always visible) */}
            <svg
              width={starSize}
              height={starSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="1.5"
              style={{ position: 'absolute', top: 0, left: 0 }}
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            
            {/* Left half for half star click/hover */}
            {!readOnly && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${starSize / 2}px`,
                  height: `${starSize}px`,
                  cursor: 'pointer',
                  zIndex: 10
                }}
                onClick={() => handleStarClick(star, true)}
                onMouseEnter={() => handleStarHover(star, true)}
              />
            )}
            
            {/* Right half for full star click/hover */}
            {!readOnly && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: `${starSize / 2}px`,
                  height: `${starSize}px`,
                  cursor: 'pointer',
                  zIndex: 10
                }}
                onClick={() => handleStarClick(star, false)}
                onMouseEnter={() => handleStarHover(star, false)}
              />
            )}
            
            {/* Filled star */}
            {filled && (
              <svg
                width={starSize}
                height={starSize}
                viewBox="0 0 24 24"
                fill={color}
                stroke={noStroke ? "none" : color}
                strokeWidth={noStroke ? "0" : "1.5"}
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
            
            {/* Half filled star */}
            {halfFilled && (
              <svg
                width={starSize}
                height={starSize}
                viewBox="0 0 24 24"
                fill="none"
                stroke={noStroke ? "none" : color}
                strokeWidth={noStroke ? "0" : "1.5"}
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
              >
                <defs>
                  <linearGradient id={starId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="50%" stopColor={color} />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
                <path
                  d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
                  fill={`url(#${starId})`}
                />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

