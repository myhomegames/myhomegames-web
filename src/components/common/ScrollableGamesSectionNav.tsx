import "./ScrollableGamesSectionNav.css";

type ScrollableGamesSectionNavProps = {
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScrollToFirst: () => void;
  onScrollToLast: () => void;
};

export default function ScrollableGamesSectionNav({
  canScrollLeft,
  canScrollRight,
  onScrollToFirst,
  onScrollToLast,
}: ScrollableGamesSectionNavProps) {
  return (
    <div className="scrollable-section-nav">
      <button
        className={`scrollable-section-nav-button ${!canScrollLeft ? "scrollable-section-nav-button-hidden" : ""}`}
        onClick={onScrollToFirst}
        aria-label="Scroll to beginning"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        className={`scrollable-section-nav-button ${!canScrollRight ? "scrollable-section-nav-button-hidden" : ""}`}
        onClick={onScrollToLast}
        aria-label="Scroll to end"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M9 6l6 6-6 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
