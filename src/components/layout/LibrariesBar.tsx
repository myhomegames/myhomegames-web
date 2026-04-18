import { useState, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLoading } from "../../contexts/LoadingContext";
import CoverSizeSlider from "../ui/CoverSizeSlider";
import ViewModeSelector from "../ui/ViewModeSelector";
import BackgroundToggle from "../ui/BackgroundToggle";
import NewGamesToggle from "../ui/NewGamesToggle";
import MainGamesToggle from "../ui/MainGamesToggle";
import DropdownMenu from "../common/DropdownMenu";
import { useBackground } from "../common/BackgroundManager";
import { API_BASE, getApiToken } from "../../config";
import { useSkin } from "../../contexts/SkinContext";
import type { ViewMode, GameLibrarySection } from "../../types";

type CollectionShortcut = {
  id: string;
  title: string;
};

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
  /** When true, show an icon toggle to include/exclude new (IGDB) games in tag lists */
  showNewGamesToggle?: boolean;
  showNewGames?: boolean;
  onShowNewGamesChange?: (value: boolean) => void;
  showNewGamesLabel?: string;
  /** Grid filter: show only IGDB main games (type 0) */
  showMainGamesToggle?: boolean;
  mainGamesOnly?: boolean;
  onMainGamesOnlyChange?: (value: boolean) => void;
  collectionShortcuts?: CollectionShortcut[];
  onSelectCollectionShortcut?: (collectionId: string) => void;
  activeCollectionShortcutId?: string | null;
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
  showNewGamesToggle = false,
  showNewGames = false,
  onShowNewGamesChange,
  showNewGamesLabel: _showNewGamesLabel,
  showMainGamesToggle = false,
  mainGamesOnly = false,
  onMainGamesOnlyChange,
  collectionShortcuts = [],
  onSelectCollectionShortcut,
  activeCollectionShortcutId = null,
}: LibrariesBarProps) {
  const { t } = useTranslation();
  const { activeSkinWeb } = useSkin();
  const { isLoading: globalLoading } = useLoading();
  const { hasBackground, isBackgroundVisible, setBackgroundVisible } = useBackground();
  // Use global loading if prop is not provided, otherwise use prop
  const isLoading = loading !== undefined ? loading : globalLoading;
  const [isNarrow, setIsNarrow] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!activeLibrary) {
      setIsNarrow(false);
      return;
    }

    let cancelled = false;

    const checkWidth = () => {
      if (cancelled) return;

      if (activeSkinWeb.libraryPagesVerticalList) {
        setIsNarrow(false);
        return;
      }

      const forceListValue = getComputedStyle(document.documentElement)
        .getPropertyValue("--mhg-libraries-force-list")
        .trim()
        .toLowerCase();
      const forceList =
        forceListValue === "1" ||
        forceListValue === "true" ||
        forceListValue === "yes" ||
        forceListValue === "on";
      if (forceList) {
        setIsNarrow(false);
        return;
      }

      const windowWidth = window.innerWidth;

      if (windowWidth < 800) {
        setIsNarrow(true);
        return;
      }

      const containerEl = containerRef.current;
      const actionsEl = actionsRef.current;
      if (!containerEl || !actionsEl) {
        return;
      }

      const containerWidth = containerEl.offsetWidth;
      const actionsWidth = actionsEl.offsetWidth;

      // Before layout is committed, widths can be 0 or tiny and falsely trigger the combobox.
      if (containerWidth < 120) {
        return;
      }

      const availableWidth = containerWidth - actionsWidth - 180;
      const minButtonsWidth = libraries.length * 110;
      setIsNarrow(availableWidth < minButtonsWidth);
    };

    const containerEl = containerRef.current;
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && containerEl
        ? new ResizeObserver(() => {
            checkWidth();
          })
        : null;
    if (resizeObserver && containerEl) {
      resizeObserver.observe(containerEl);
    }

    checkWidth();
    const timeoutId = window.setTimeout(checkWidth, 100);

    let rafOuter = 0;
    rafOuter = requestAnimationFrame(() => {
      checkWidth();
      requestAnimationFrame(() => {
        if (!cancelled) checkWidth();
      });
    });

    window.addEventListener("resize", checkWidth);

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      window.clearTimeout(timeoutId);
      cancelAnimationFrame(rafOuter);
      window.removeEventListener("resize", checkWidth);
    };
  }, [libraries, viewMode, coverSize, activeLibrary, activeSkinWeb.libraryPagesVerticalList]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLibrary = libraries.find((lib) => lib.key === e.target.value);
    if (selectedLibrary) {
      onSelectLibrary(selectedLibrary);
    }
  };

  const showIconCluster =
    (hasBackground && !hideBackgroundToggle) ||
    (showNewGamesToggle && !!onShowNewGamesChange) ||
    (showMainGamesToggle && !!onMainGamesOnlyChange);

  /* Su /collections/:id evidenziare solo la raccolta, non anche una voce "pagina" */
  const showLibraryActiveHighlight = activeCollectionShortcutId == null;

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
                      type="button"
                      data-mhg-library-key={s.key}
                      className={`mhg-library-button flex min-w-0 items-center gap-2 text-left ${
                        showLibraryActiveHighlight && activeLibrary?.key === s.key
                          ? "mhg-library-active"
                          : ""
                      }`}
                      onClick={() => onSelectLibrary(s)}
                    >
                      <span className="mhg-library-button-label min-w-0 flex-1 truncate">
                        {s.title || t(`libraries.${s.key}`)}
                      </span>
                    </button>
                  ))
                )}
                {collectionShortcuts.length > 0 && onSelectCollectionShortcut && (
                  <div className="mhg-collections-shortcuts">
                    <div className="mhg-collections-shortcuts-title">
                      {t("libraries.collections")}
                    </div>
                    {collectionShortcuts.map((collection) => {
                      const isCollectionSelected =
                        activeCollectionShortcutId != null &&
                        activeCollectionShortcutId === collection.id;
                      return (
                        <button
                          key={collection.id}
                          type="button"
                          className={`mhg-collection-shortcut-button min-w-0 text-left${
                            isCollectionSelected
                              ? " mhg-collection-shortcut-button--selected"
                              : ""
                          }`}
                          onClick={() => onSelectCollectionShortcut(collection.id)}
                          title={collection.title}
                        >
                          <span className="min-w-0 flex-1 truncate">{collection.title}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {error && <div className="mhg-libraries-error">{error}</div>}
              </div>
            )}
          </>
        )}

        <div className="mhg-libraries-actions" ref={actionsRef}>
          {showIconCluster ? (
            <div className="mhg-libraries-actions-icon-cluster">
              {hasBackground && !hideBackgroundToggle && (
                <div className="mhg-libraries-actions-background-toggle-container">
                  <BackgroundToggle
                    isVisible={isBackgroundVisible}
                    onChange={setBackgroundVisible}
                  />
                </div>
              )}
              {showNewGamesToggle && onShowNewGamesChange && (
                <div className="mhg-libraries-actions-new-games-container">
                  <NewGamesToggle
                    showNewGames={showNewGames}
                    onChange={onShowNewGamesChange}
                  />
                </div>
              )}
              {showMainGamesToggle && onMainGamesOnlyChange && (
                <div className="mhg-libraries-actions-main-games-container">
                  <MainGamesToggle
                    mainGamesOnly={mainGamesOnly}
                    onChange={onMainGamesOnlyChange}
                  />
                </div>
              )}
            </div>
          ) : null}
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
                disabled={!activeLibrary || activeLibrary.key !== "library"}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
