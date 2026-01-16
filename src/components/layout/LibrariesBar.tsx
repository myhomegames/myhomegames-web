import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLoading } from "../../contexts/LoadingContext";
import CoverSizeSlider from "../ui/CoverSizeSlider";
import ViewModeSelector from "../ui/ViewModeSelector";
import BackgroundToggle from "../ui/BackgroundToggle";
import DropdownMenu from "../common/DropdownMenu";
import { useBackground } from "../common/BackgroundManager";
import { API_BASE, getApiToken } from "../../config";
import type { ViewMode, GameLibrarySection } from "../../types";
import "./LibrariesBar.css";

type LibrariesBarProps = {
  libraries: GameLibrarySection[];
  activeLibrary: GameLibrarySection | null;
  onSelectLibrary: (library: GameLibrarySection) => void;
  loading?: boolean; // Optional, defaults to global loading
  error: string | null;
  coverSize?: number;
  onCoverSizeChange?: (size: number) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  hideBackgroundToggle?: boolean;
  onReloadMetadata?: () => Promise<void>;
};

export default function LibrariesBar({
  libraries,
  activeLibrary,
  onSelectLibrary,
  loading,
  error,
  coverSize = 150,
  onCoverSizeChange,
  viewMode = "grid",
  onViewModeChange,
  hideBackgroundToggle = false,
  onReloadMetadata,
}: LibrariesBarProps) {
  const { t } = useTranslation();
  const { isLoading: globalLoading } = useLoading();
  const { hasBackground, isBackgroundVisible, setBackgroundVisible } = useBackground();
  // Use global loading if prop is not provided, otherwise use prop
  const isLoading = loading !== undefined ? loading : globalLoading;
  const [isNarrow, setIsNarrow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only check width if activeLibrary is present (LibrariesBar is actually being used)
    if (!activeLibrary) {
      setIsNarrow(false);
      return;
    }

    const checkWidth = () => {
      // Use window width as primary check
      const windowWidth = window.innerWidth;
      
      // Show combobox if window is narrower than 800px
      if (windowWidth < 800) {
        setIsNarrow(true);
        return;
      }

      // Otherwise, check if buttons would fit
      if (containerRef.current && actionsRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const actionsWidth = actionsRef.current.offsetWidth;
        // Calculate available width for library buttons
        const availableWidth = containerWidth - actionsWidth - 180; // 180px for margins and spacing
        // Estimate minimum width needed (approximately 110px per button)
        const minButtonsWidth = libraries.length * 110;
        // Show combobox if available width is less than minimum needed
        setIsNarrow(availableWidth < minButtonsWidth);
      }
    };

    // Initial check
    checkWidth();
    
    // Check again after a short delay to ensure DOM is ready
    const timeoutId = setTimeout(checkWidth, 100);

    window.addEventListener("resize", checkWidth);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", checkWidth);
    };
  }, [libraries, viewMode, coverSize, activeLibrary]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLibrary = libraries.find((lib) => lib.key === e.target.value);
    if (selectedLibrary) {
      onSelectLibrary(selectedLibrary);
    }
  };


  return (
    <div className="mhg-libraries-bar">
      <div className="mhg-libraries-bar-container" ref={containerRef}>
        {/* Menu dropdown in fondo a sinistra */}
        {API_BASE && getApiToken() && (
          <div className="mhg-libraries-menu-container">
            <DropdownMenu
              className="mhg-libraries-menu-dropdown"
              onReload={onReloadMetadata}
            />
          </div>
        )}
        
        {activeLibrary && (
          <>
            {isNarrow ? (
              <div className="mhg-libraries-combobox-container">
                {isLoading && libraries.length === 0 ? null : (
                  <select
                    id="libraries-select"
                    name="library"
                    className="mhg-libraries-combobox"
                    value={activeLibrary?.key || ""}
                    onChange={handleSelectChange}
                  >
                    {libraries.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.title || t(`libraries.${s.key}`)}
                      </option>
                    ))}
                  </select>
                )}
                {error && <div className="mhg-libraries-error">{error}</div>}
              </div>
            ) : (
              <div className="mhg-libraries-container">
                {isLoading && libraries.length === 0 ? null : (
                  libraries.map((s) => (
                    <button
                      key={s.key}
                      className={`mhg-library-button ${
                        activeLibrary?.key === s.key ? "mhg-library-active" : ""
                      }`}
                      onClick={() => onSelectLibrary(s)}
                    >
                      {s.title || t(`libraries.${s.key}`)}
                    </button>
                  ))
                )}
                {error && <div className="mhg-libraries-error">{error}</div>}
              </div>
            )}
          </>
        )}

        <div className="mhg-libraries-actions" ref={actionsRef}>
          {hasBackground && !hideBackgroundToggle && (
            <div className="mhg-libraries-actions-background-toggle-container">
              <BackgroundToggle
                isVisible={isBackgroundVisible}
                onChange={setBackgroundVisible}
              />
            </div>
          )}
          {onCoverSizeChange && (
            <div
              className={`mhg-libraries-actions-slider-container ${
                viewMode === "grid" ? "" : "hidden"
              }`}
            >
              <CoverSizeSlider value={coverSize} onChange={onCoverSizeChange} />
            </div>
          )}
          {onViewModeChange && (
            <div className="mhg-libraries-actions-view-mode-container">
              <ViewModeSelector 
                value={viewMode} 
                onChange={onViewModeChange}
                disabled={activeLibrary ? activeLibrary.key !== "library" && activeLibrary.key !== "category" : false}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
