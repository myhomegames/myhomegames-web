import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
type SummaryProps = {
  summary: string;
  truncateOnly?: boolean;
  maxLines?: number;
  fontSize?: string;
};

export default function Summary({ summary, truncateOnly = false, maxLines = 4, fontSize }: SummaryProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textRef.current && !truncateOnly) {
      // Check if text exceeds maxLines
      const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * maxLines;
      if (textRef.current.scrollHeight > maxHeight) {
        setShowExpandButton(true);
      }
    }
  }, [summary, truncateOnly, maxLines]);

  if (!summary) {
    return null;
  }

  const textStyle = {
    ["--summary-max-lines" as string]: String(maxLines),
    ...(fontSize ? { ["--summary-font-size" as string]: fontSize } : {}),
  } as CSSProperties;

  return (
    <div className="summary-root">
      <div
        ref={textRef}
        className={`text-white summary-text${isExpanded ? " summary-text--expanded" : ""}`}
        style={textStyle}
      >
        {summary}
      </div>
      {showExpandButton && !truncateOnly && (
        <button type="button" className="summary-toggle" onClick={() => setIsExpanded(!isExpanded)}>
          <span>{isExpanded ? t("common.less") : t("common.more")}</span>
          <svg
            className={`summary-toggle-chevron${isExpanded ? " summary-toggle-chevron--expanded" : ""}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
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

