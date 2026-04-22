import { useState, type CSSProperties, type MouseEvent } from "react";
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
  
  const handleStarClick = (e: MouseEvent<HTMLDivElement>, starValue: number, isHalf: boolean) => {
    e.preventDefault();
    e.stopPropagation();
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

  const rowStyle = {
    "--sr-gap": `${gap}px`,
    "--sr-star-size": `${starSize}px`,
  } as CSSProperties;

  return (
    <div className="star-rating" style={rowStyle} onMouseLeave={handleMouseLeave}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = displayRating >= star;
        const halfFilled = displayRating >= star - 0.5 && displayRating < star;
        const starId = `star-${star}-${displayRating}`;
        
        return (
          <div
            key={star}
            className={`star-rating-star${readOnly ? "" : " star-rating-star--interactive"}`}
          >
            {/* Background star (always visible) */}
            <svg
              className="star-rating-star-svg-bg"
              width={starSize}
              height={starSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="1.5"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            
            {/* Left half for half star click/hover */}
            {!readOnly && (
              <div
                className="star-rating-star-half-hit star-rating-star-half-hit--left"
                onClick={(e) => handleStarClick(e, star, true)}
                onMouseEnter={() => handleStarHover(star, true)}
              />
            )}
            
            {/* Right half for full star click/hover */}
            {!readOnly && (
              <div
                className="star-rating-star-half-hit star-rating-star-half-hit--right"
                onClick={(e) => handleStarClick(e, star, false)}
                onMouseEnter={() => handleStarHover(star, false)}
              />
            )}
            
            {/* Filled star */}
            {filled && (
              <svg
                className="star-rating-star-svg-overlay"
                width={starSize}
                height={starSize}
                viewBox="0 0 24 24"
                fill={color}
                stroke={noStroke ? "none" : color}
                strokeWidth={noStroke ? "0" : "1.5"}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
            
            {/* Half filled star */}
            {halfFilled && (
              <svg
                className="star-rating-star-svg-overlay"
                width={starSize}
                height={starSize}
                viewBox="0 0 24 24"
                fill="none"
                stroke={noStroke ? "none" : color}
                strokeWidth={noStroke ? "0" : "1.5"}
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

