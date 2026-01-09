import { useState, useRef, useEffect } from "react";
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

  return (
    <div style={{ marginTop: '16px' }}>
      <div 
        ref={textRef}
        className="text-white" 
        style={{ 
          opacity: 0.8,
          fontFamily: 'var(--font-body-1-font-family)',
          fontSize: fontSize || 'var(--font-body-1-font-size)',
          lineHeight: 'var(--font-body-1-line-height)',
          display: '-webkit-box',
          WebkitLineClamp: isExpanded ? 'none' : maxLines,
          WebkitBoxOrient: 'vertical',
          overflow: isExpanded ? 'visible' : 'hidden',
          textOverflow: isExpanded ? 'clip' : 'ellipsis'
        }}
      >
        {summary}
      </div>
      {showExpandButton && !truncateOnly && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            backgroundColor: 'transparent',
            border: 'none',
            color: '#E5A00D',
            cursor: 'pointer',
            padding: 0,
            marginTop: '8px',
            fontFamily: 'var(--font-body-1-font-family)',
            fontSize: 'var(--font-body-1-font-size)',
            lineHeight: 'var(--font-body-1-line-height)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>{isExpanded ? t("common.less") : t("common.more")}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
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

