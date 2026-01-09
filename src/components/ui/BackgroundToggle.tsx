import { useTranslation } from "react-i18next";
import "./BackgroundToggle.css";

type BackgroundToggleProps = {
  isVisible: boolean;
  onChange: (visible: boolean) => void;
  disabled?: boolean;
};

export default function BackgroundToggle({
  isVisible,
  onChange,
  disabled = false,
}: BackgroundToggleProps) {
  const { t } = useTranslation();

  return (
    <button
      className="background-toggle-button"
      onClick={() => !disabled && onChange(!isVisible)}
      disabled={disabled}
      aria-label={isVisible ? t("common.hideBackground") : t("common.showBackground")}
      title={isVisible ? t("common.hideBackground") : t("common.showBackground")}
    >
      <span className="background-toggle-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
        {isVisible ? (
          <path
            d="M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v8H8V8z"
            fill="currentColor"
          />
        ) : (
          <path
            d="M4 4h16v16H4V4zm2 2v12h12V6H6z"
            fill="currentColor"
            opacity="0.5"
          />
        )}
        </svg>
      </span>
    </button>
  );
}

