import { useTranslation } from "react-i18next";

import type { CSSProperties } from "react";

import Tooltip from "../common/Tooltip";

type ActivitySpinnerProps = {
  isLoading: boolean;
  /** Shown in a tooltip on hover (1s delay) while the spinner is visible. */
  tooltipText?: string;
  /** Extra classes on the wrapper (e.g. dock-specific alignment). */
  className?: string;
  style?: CSSProperties;
  iconStyle?: CSSProperties;
};

/** Global activity indicator (same markup as the header spinner). */
export default function ActivitySpinner({
  isLoading,
  tooltipText,
  className,
  style,
  iconStyle,
}: ActivitySpinnerProps) {
  const { t } = useTranslation();

  const spinner = (
    <div
      className={["mhg-activity-spinner", className].filter(Boolean).join(" ")}
      aria-label={isLoading ? t("header.loading", "Loading") : undefined}
      aria-hidden={!isLoading}
      style={{ visibility: isLoading ? "visible" : "hidden", ...style }}
    >
      <svg
        width="20"
        height="20"
        style={iconStyle}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
        className="mhg-spinner-icon"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
        />
      </svg>
    </div>
  );

  if (!isLoading || !tooltipText) {
    return spinner;
  }

  return (
    <Tooltip text={tooltipText} position="bottom" delay={1000}>
      {spinner}
    </Tooltip>
  );
}
