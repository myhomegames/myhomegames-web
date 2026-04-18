import { useState, useRef, useEffect, useLayoutEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { ViewMode } from "../../types";
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
  const dropdownPortalRef = useRef<HTMLDivElement>(null);
  const [portalPlacement, setPortalPlacement] = useState<{
    top: number;
    right: number;
  } | null>(null);

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

  useLayoutEffect(() => {
    if (!isOpen || disabled) {
      setPortalPlacement(null);
      return;
    }
    function updatePlacement() {
      const el = selectorRef.current;
      if (!el) return;
      const sr = el.getBoundingClientRect();
      setPortalPlacement({
        top: sr.bottom + 8,
        right: window.innerWidth - sr.right + 24,
      });
    }
    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    return () => window.removeEventListener("resize", updatePlacement);
  }, [isOpen, disabled]);

  function readPlacementFromTrigger(): {
    top: number;
    right: number;
  } | null {
    const el = selectorRef.current;
    if (!el) return null;
    const sr = el.getBoundingClientRect();
    return {
      top: sr.bottom + 8,
      right: window.innerWidth - sr.right + 24,
    };
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const t = event.target as Node;
      if (selectorRef.current?.contains(t)) return;
      if (dropdownPortalRef.current?.contains(t)) return;
      setIsOpen(false);
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
        onClick={() => {
          if (disabled) return;
          if (isOpen) {
            setPortalPlacement(null);
            setIsOpen(false);
          } else {
            const p = readPlacementFromTrigger();
            setPortalPlacement(p);
            setIsOpen(true);
          }
        }}
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
        <svg
          width="12"
          height="12"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
          className={`view-mode-arrow ${isOpen ? "open" : ""}${disabled ? " view-mode-arrow--inactive" : ""}`}
          aria-hidden={disabled}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen &&
        !disabled &&
        portalPlacement &&
        createPortal(
          <div
            ref={dropdownPortalRef}
            className="view-mode-dropdown view-mode-dropdown--portaled"
            style={{
              position: "fixed",
              top: portalPlacement.top,
              right: portalPlacement.right,
              left: "auto",
              marginTop: 0,
              zIndex: 10008,
            }}
          >
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
          </div>,
          document.body
        )}
    </div>
  );
}
