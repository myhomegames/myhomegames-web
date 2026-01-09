import "./RecommendedSectionNav.css";

type RecommendedSectionNavProps = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScrollToFirst: () => void;
  onScrollToLast: () => void;
};

export default function RecommendedSectionNav({
  canScrollLeft,
  canScrollRight,
  onScrollToFirst,
  onScrollToLast,
}: RecommendedSectionNavProps) {
  return (
    <div className="recommended-section-nav">
      <button
        className={`recommended-section-nav-button ${!canScrollLeft ? 'recommended-section-nav-button-hidden' : ''}`}
        onClick={canScrollLeft ? onScrollToFirst : undefined}
        aria-label="Go to first"
        disabled={!canScrollLeft}
      >
        <svg
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
      </button>
      <button
        className={`recommended-section-nav-button ${!canScrollRight ? 'recommended-section-nav-button-hidden' : ''}`}
        onClick={canScrollRight ? onScrollToLast : undefined}
        aria-label="Go to last"
        disabled={!canScrollRight}
      >
        <svg
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
      </button>
    </div>
  );
}

