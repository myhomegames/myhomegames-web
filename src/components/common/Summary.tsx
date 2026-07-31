import { useState, useRef, useEffect } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { isSmartTvBrowser } from "../../utils/smartTv";

type SummaryProps = {
  summary: string;
  truncateOnly?: boolean;
  maxLines?: number;
  fontSize?: string;
  /**
   * When set, activating the summary (click / OK) opens an overlay instead of
   * expanding the text in place (Smart TV detail via skin `web.tvSummaryOverlay`).
   */
  onOpenOverlay?: () => void;
};

/** Matches skin CSS that hides `.summary-toggle` on narrow / TV surfaces. */
const SUMMARY_TEXT_ACTIVATE_MQ = "(max-width: 720px)";

function useSummaryTextActivatableSurface(): boolean {
  const [compact, setCompact] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      document.documentElement.dataset.mhgTv === "1" ||
      isSmartTvBrowser() ||
      window.matchMedia(SUMMARY_TEXT_ACTIVATE_MQ).matches
    );
  });

  useEffect(() => {
    const sync = () => {
      setCompact(
        document.documentElement.dataset.mhgTv === "1" ||
          isSmartTvBrowser() ||
          window.matchMedia(SUMMARY_TEXT_ACTIVATE_MQ).matches,
      );
    };
    sync();
    window.addEventListener("resize", sync);
    const mq = window.matchMedia(SUMMARY_TEXT_ACTIVATE_MQ);
    mq.addEventListener?.("change", sync);
    return () => {
      window.removeEventListener("resize", sync);
      mq.removeEventListener?.("change", sync);
    };
  }, []);

  return compact;
}

export default function Summary({
  summary,
  truncateOnly = false,
  maxLines = 4,
  fontSize,
  onOpenOverlay,
}: SummaryProps) {
  const { t, i18n } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const opensOverlay = typeof onOpenOverlay === "function";
  const textActivatableSurface = useSummaryTextActivatableSurface();

  useEffect(() => {
    setIsExpanded(false);
  }, [summary, i18n.language]);

  useEffect(() => {
    setShowExpandButton(false);
    if (opensOverlay) return;
    if (textRef.current && !truncateOnly) {
      const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * maxLines;
      if (textRef.current.scrollHeight > maxHeight) {
        setShowExpandButton(true);
      }
    }
  }, [summary, truncateOnly, maxLines, opensOverlay]);

  if (!summary) {
    return null;
  }

  const canToggle = opensOverlay
    ? !truncateOnly
    : showExpandButton && !truncateOnly;

  /*
   * Desktop web: only the More/Less button expands — text has no hover/click.
   * Phone + Smart TV: toggle is hidden in skin CSS; activate via the text itself.
   * Overlay mode (TV): text opens the full-screen summary.
   */
  const textActivatable =
    canToggle && (opensOverlay || textActivatableSurface);

  const textStyle = {
    ["--summary-max-lines" as string]: String(maxLines),
    ...(fontSize ? { ["--summary-font-size" as string]: fontSize } : {}),
  } as CSSProperties;

  const activate = () => {
    if (!canToggle) return;
    if (onOpenOverlay) {
      onOpenOverlay();
      return;
    }
    setIsExpanded((prev) => !prev);
  };

  const onTextKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!textActivatable) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      activate();
    }
  };

  return (
    <div className={`summary-root${opensOverlay ? " summary-root--overlay" : ""}`}>
      <div
        ref={textRef}
        className={`text-white summary-text${isExpanded && !opensOverlay ? " summary-text--expanded" : ""}${
          textActivatable ? " summary-text--toggleable" : ""
        }`}
        style={textStyle}
        onClick={textActivatable ? activate : undefined}
        onKeyDown={onTextKeyDown}
        role={textActivatable ? "button" : undefined}
        tabIndex={textActivatable ? 0 : undefined}
        aria-expanded={textActivatable && !opensOverlay ? isExpanded : undefined}
        aria-haspopup={opensOverlay && textActivatable ? "dialog" : undefined}
        data-mhg-tv-focus={textActivatable ? "" : undefined}
      >
        {summary}
      </div>
      {canToggle && !opensOverlay && (
        <button type="button" className="summary-toggle" onClick={activate}>
          <span>{isExpanded ? t("common.less") : t("common.more")}</span>
          <svg
            className={`summary-toggle-chevron${isExpanded ? " summary-toggle-chevron--expanded" : ""}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M7 10l5 5 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
