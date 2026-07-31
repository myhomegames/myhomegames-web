import { useState, useRef, useEffect } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

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
    if (!canToggle) return;
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
          canToggle ? " summary-text--toggleable" : ""
        }`}
        style={textStyle}
        onClick={activate}
        onKeyDown={onTextKeyDown}
        role={canToggle ? "button" : undefined}
        tabIndex={canToggle ? 0 : undefined}
        aria-expanded={canToggle && !opensOverlay ? isExpanded : undefined}
        aria-haspopup={opensOverlay ? "dialog" : undefined}
        data-mhg-tv-focus={canToggle ? "" : undefined}
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
