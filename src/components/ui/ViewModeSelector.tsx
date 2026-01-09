import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { ViewMode } from "../../types";
import "./ViewModeSelector.css";

type ViewModeSelectorProps = {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  disabled?: boolean;
};

export default function ViewModeSelector({
  value,
  onChange,
  disabled = false,
}: ViewModeSelectorProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [iconHover, setIconHover] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Recreate modes array when language changes
  const modes: { key: ViewMode; label: string; icon: string }[] = useMemo(
    () => [
      { key: "grid", label: t("viewMode.grid"), icon: "⊞" },
      { key: "detail", label: t("viewMode.detail"), icon: "☰" },
      { key: "table", label: t("viewMode.table"), icon: "☷" },
    ],
    [t, i18n.language]
  );

  const currentMode = modes.find((m) => m.key === value) || modes[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        selectorRef.current &&
        !selectorRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen]);

  return (
    <div ref={selectorRef} className="view-mode-selector">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        type="button"
        className={`view-mode-button ${disabled ? "disabled" : ""}`}
        disabled={disabled}
        onMouseEnter={() => {
          if (!disabled) {
            setIconHover(true);
          }
        }}
        onMouseLeave={() => {
          if (!disabled) {
            setIconHover(false);
          }
        }}
      >
        <span className={`view-mode-icon ${iconHover && !disabled ? "hover" : ""}`}>
          {currentMode.icon}
        </span>
        {!disabled && (
          <svg
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            className={`view-mode-arrow ${isOpen ? "open" : ""}`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>

      {isOpen && !disabled && (
        <div className="view-mode-dropdown">
          {modes.map((mode) => (
            <button
              key={mode.key}
              onClick={() => {
                onChange(mode.key);
                setIsOpen(false);
              }}
              type="button"
              className={`view-mode-option ${
                value === mode.key ? "active" : ""
              }`}
            >
              <span className="view-mode-option-icon">{mode.icon}</span>
              <span>{mode.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
