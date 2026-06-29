import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useAutoTranslate } from "../../hooks/useAutoTranslate";

type SummaryProps = {
  summary: string;
  truncateOnly?: boolean;
  maxLines?: number;
  fontSize?: string;
  /** i18n key checked before machine translation (e.g. game.123.summary). */
  translationKey?: string;
  /** Translate to the language from Settings (default: on for detail, off when truncateOnly). */
  autoTranslate?: boolean;
};

export default function Summary({
  summary,
  truncateOnly = false,
  maxLines = 4,
  fontSize,
  translationKey,
  autoTranslate,
}: SummaryProps) {
  const { t, i18n } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const shouldTranslate = autoTranslate ?? !truncateOnly;
  const displaySummary = useAutoTranslate(summary, translationKey ?? "summary.auto", {
    disabled: !shouldTranslate || !summary,
    format: "prose",
  });

  useEffect(() => {
    setIsExpanded(false);
  }, [summary, displaySummary, i18n.language]);

  useEffect(() => {
    setShowExpandButton(false);
    if (textRef.current && !truncateOnly) {
      const lineHeight = parseFloat(getComputedStyle(textRef.current).lineHeight);
      const maxHeight = lineHeight * maxLines;
      if (textRef.current.scrollHeight > maxHeight) {
        setShowExpandButton(true);
      }
    }
  }, [displaySummary, truncateOnly, maxLines]);

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
        {displaySummary}
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

