import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type MouseEvent } from "react";

type StarRatingProps = {
  rating: number; // Rating from 0 to 5
  starSize?: number;
  gap?: number;
  color?: string; // Color for filled stars, defaults to white
  noStroke?: boolean; // Remove stroke/border from stars
  readOnly?: boolean; // If false, allows clicking to change rating
  onRatingChange?: (newRating: number) => void; // Callback when rating changes (receives value from 1-10)
};

function isLeftHalf(el: HTMLElement, clientX: number): boolean {
  const rect = el.getBoundingClientRect();
  return clientX - rect.left < rect.width / 2;
}

export default function StarRating({
  rating,
  starSize = 16,
  gap = 4,
  color = "#ffffff",
  noStroke = false,
  readOnly = true,
  onRatingChange,
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const applyRating = (starValue: number, half: boolean) => {
    if (readOnly || !onRatingChange) return;
    const ratingValue = half ? starValue - 0.5 : starValue;
    onRatingChange(ratingValue * 2);
  };

  const handleStarClick = (e: MouseEvent<HTMLButtonElement>, starValue: number) => {
    e.preventDefault();
    e.stopPropagation();
    applyRating(starValue, isLeftHalf(e.currentTarget, e.clientX));
  };

  const handleStarPointerMove = (e: PointerEvent<HTMLButtonElement>, starValue: number) => {
    if (readOnly || !onRatingChange) return;
    // Touch drag preview is noisy; keep hover preview for fine pointers.
    if (e.pointerType === "touch") return;
    const half = isLeftHalf(e.currentTarget, e.clientX);
    setHoverRating(half ? starValue - 0.5 : starValue);
  };

  const handleMouseLeave = () => {
    if (!readOnly) {
      setHoverRating(null);
    }
  };

  const handleStarKeyDown = (e: KeyboardEvent<HTMLButtonElement>, starValue: number) => {
    if (readOnly || !onRatingChange) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onRatingChange(starValue * 2);
    }
  };

  // Use hoverRating for preview if available, otherwise use actual rating
  const displayRating = hoverRating !== null ? hoverRating : rating;

  const rowStyle = {
    "--sr-gap": `${gap}px`,
    "--sr-star-size": `${starSize}px`,
  } as CSSProperties;

  return (
    <div
      className="star-rating"
      style={rowStyle}
      onMouseLeave={handleMouseLeave}
      role={readOnly ? undefined : "group"}
      aria-label={readOnly ? undefined : "Rating"}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = displayRating >= star;
        const halfFilled = displayRating >= star - 0.5 && displayRating < star;
        const starId = `star-${star}-${displayRating}`;
        const starInner = (
          <>
            <svg
              className="star-rating-star-svg-bg"
              width={starSize}
              height={starSize}
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255, 255, 255, 0.3)"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>

            {filled && (
              <svg
                className="star-rating-star-svg-overlay"
                width={starSize}
                height={starSize}
                viewBox="0 0 24 24"
                fill={color}
                stroke={noStroke ? "none" : color}
                strokeWidth={noStroke ? "0" : "1.5"}
                aria-hidden="true"
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}

            {halfFilled && (
              <svg
                className="star-rating-star-svg-overlay"
                width={starSize}
                height={starSize}
                viewBox="0 0 24 24"
                fill="none"
                stroke={noStroke ? "none" : color}
                strokeWidth={noStroke ? "0" : "1.5"}
                aria-hidden="true"
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
          </>
        );

        if (readOnly) {
          return (
            <div key={star} className="star-rating-star">
              {starInner}
            </div>
          );
        }

        return (
          <button
            key={star}
            type="button"
            className="star-rating-star star-rating-star--interactive"
            aria-label={`${star}`}
            aria-pressed={filled || halfFilled}
            onClick={(e) => handleStarClick(e, star)}
            onPointerMove={(e) => handleStarPointerMove(e, star)}
            onKeyDown={(e) => handleStarKeyDown(e, star)}
          >
            {starInner}
          </button>
        );
      })}
    </div>
  );
}
