import { useState, useLayoutEffect, useRef, useMemo, useEffect } from "react";
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
import { useLibraryGames } from "../../contexts/LibraryGamesContext";
import type { ViewMode, GameLibrarySection, GameItem, CollectionItem } from "../../types";
import SidebarSearchOverlay from "./SidebarSearchOverlay";

type CollectionShortcut = {
  id: string;
  title: string;
};

/** Prefisso valore `<option>` per le scorciatoie raccolte (evita collisioni con `library.key`). */
const COMBOBOX_COLLECTION_SHORTCUT_PREFIX = "mhg:collection:";

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
  /** When skin `web.sidebarSearchPopup` is true, pass data for the sidebar search modal. */
  sidebarSearchGames?: GameItem[];
  sidebarSearchCollections?: CollectionItem[];
  sidebarSearchDevelopers?: CollectionItem[];
  sidebarSearchPublishers?: CollectionItem[];
  onSidebarSearchGameSelect?: (game: GameItem) => void;
  onSidebarSearchPlay?: (game: GameItem) => void;
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
  sidebarSearchGames = [],
  sidebarSearchCollections = [],
  sidebarSearchDevelopers = [],
  sidebarSearchPublishers = [],
  onSidebarSearchGameSelect,
  onSidebarSearchPlay,
}: LibrariesBarProps) {
  const { t } = useTranslation();
  const { activeSkinWeb } = useSkin();
  const { games: libraryGamesAll } = useLibraryGames();
  const libraryGamesCount = libraryGamesAll.length;
  const installedGamesCount = useMemo(
    () =>
      libraryGamesAll.reduce(
        (count, game) =>
          count + (Array.isArray(game.executables) && game.executables.length > 0 ? 1 : 0),
        0
      ),
    [libraryGamesAll]
  );
  const ownedGamesInGamesSidebar = activeSkinWeb.ownedGamesFirstInGamesSidebar;

  /**
   * Tracks the current filter applied on the Library page so that sidebar
   * quick-filter entries (e.g. "Installati") can be highlighted when active.
   * Updated via a window event dispatched from `useGamesListPage` and, as
   * a fallback, from the initial localStorage value on mount.
   */
  const [currentLibraryFilterField, setCurrentLibraryFilterField] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return window.localStorage.getItem("libraryFilterField") || "all";
  });
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ prefix?: string; filterField?: string }>).detail;
      if (!detail || detail.prefix !== "library" || !detail.filterField) return;
      setCurrentLibraryFilterField(detail.filterField);
    };
    window.addEventListener("mhg-list-filter-changed", handler as EventListener);
    return () => window.removeEventListener("mhg-list-filter-changed", handler as EventListener);
  }, []);

  const libraryForGamesSidebar = useMemo(
    () => libraries.find((s) => s.key === "library") ?? null,
    [libraries]
  );

  const mainSidebarLibraries = useMemo(() => {
    if (!ownedGamesInGamesSidebar) {
      return libraries;
    }
    return libraries.filter((s) => s.key !== "library");
  }, [libraries, ownedGamesInGamesSidebar]);

  /** With sidebar collection shortcuts, do not show the “all collections” overview row (no “Raccolte” in the bar). */
  const collectionShortcutsActive =
    collectionShortcuts.length > 0 && !!onSelectCollectionShortcut;
  const hideCollectionsOverviewRow =
    activeSkinWeb.collectionsShortcutList && collectionShortcutsActive;

  const mainNavPageLibraries = useMemo(() => {
    if (!hideCollectionsOverviewRow) {
      return mainSidebarLibraries;
    }
    return mainSidebarLibraries.filter((s) => s.key !== "collections");
  }, [mainSidebarLibraries, hideCollectionsOverviewRow]);

  const showGamesShortcutsSection =
    (collectionShortcuts.length > 0 && !!onSelectCollectionShortcut) ||
    (!!libraryForGamesSidebar && ownedGamesInGamesSidebar);

  const comboboxLibraries = useMemo(() => {
    let base = libraries;
    if (hideCollectionsOverviewRow) {
      base = base.filter((s) => s.key !== "collections");
    }
    if (!ownedGamesInGamesSidebar || !libraryForGamesSidebar) {
      return base;
    }
    const rest = base.filter((s) => s.key !== "library");
    return [libraryForGamesSidebar, ...rest];
  }, [libraries, hideCollectionsOverviewRow, ownedGamesInGamesSidebar, libraryForGamesSidebar]);

  const { isLoading: globalLoading } = useLoading();
  const { hasBackground, isBackgroundVisible, setBackgroundVisible } = useBackground();
  // Use global loading if prop is not provided, otherwise use prop
  const isLoading = loading !== undefined ? loading : globalLoading;
  const [isNarrow, setIsNarrow] = useState(false);
  /**
   * Barra orizzontale: il primo render usa `isNarrow === false` e mostrerebbe l’elenco
   * completo; un attimo dopo `useLayoutEffect` imposta la combobox → flash visivo.
   * Teniamo nascosto il contenuto finché non abbiamo misurato (prima del paint).
   * Con `libraryPagesVerticalList` non serve (nessuna combobox).
   */
  const [librariesBarLayoutReady, setLibrariesBarLayoutReady] = useState(
    () => activeSkinWeb.libraryPagesVerticalList
  );
  const isFirstLibrariesLayoutRef = useRef(true);
  const prevCollectionShortcutCountRef = useRef(collectionShortcuts.length);
  const [sidebarSearchOpen, setSidebarSearchOpen] = useState(false);
  /** Collapsible “Giochi” / games sidebar block (GOG skin: full-width row + chevron). */
  const [gamesSidebarExpanded, setGamesSidebarExpanded] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!activeLibrary) {
      setIsNarrow(false);
      setLibrariesBarLayoutReady(true);
      return;
    }

    if (!activeSkinWeb.libraryPagesVerticalList) {
      const shortcutCountChanged =
        prevCollectionShortcutCountRef.current !== collectionShortcuts.length;
      if (
        isFirstLibrariesLayoutRef.current ||
        shortcutCountChanged
      ) {
        setLibrariesBarLayoutReady(false);
        prevCollectionShortcutCountRef.current = collectionShortcuts.length;
      }
    }
    isFirstLibrariesLayoutRef.current = false;

    let cancelled = false;

    const checkWidth = () => {
      if (cancelled) return;

      if (activeSkinWeb.libraryPagesVerticalList) {
        setIsNarrow(false);
        setLibrariesBarLayoutReady(true);
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
        setLibrariesBarLayoutReady(true);
        return;
      }

      const windowWidth = window.innerWidth;

      if (windowWidth < 800) {
        setIsNarrow(true);
        setLibrariesBarLayoutReady(true);
        return;
      }

      const containerEl = containerRef.current;
      const actionsEl = actionsRef.current;
      if (!containerEl || !actionsEl) {
        requestAnimationFrame(() => {
          if (!cancelled) checkWidth();
        });
        return;
      }

      const containerWidth = containerEl.offsetWidth;
      const actionsWidth = actionsEl.offsetWidth;

      // Before layout is committed, widths can be 0 or tiny and falsely trigger the combobox.
      if (containerWidth < 120) {
        requestAnimationFrame(() => {
          if (!cancelled) checkWidth();
        });
        return;
      }

      const availableWidth = containerWidth - actionsWidth - 180;
      /*
       * Estima la larghezza minima necessaria per mostrare inline tutti gli
       * elementi della barra. Oltre alle pagine principali teniamo conto,
       * quando presenti, anche del trigger di ricerca nella sidebar e della
       * sezione "Giochi / Raccolte" (intestazione + eventuali voci "I miei
       * giochi" / "Installati" + scorciatoie delle collezioni). In skin
       * orizzontali come Plex questo evita che il numero di collezioni
       * venga ignorato quando si decide se passare alla combobox.
       */
      let estimatedItems = mainNavPageLibraries.length;
      const sidebarSearchPopupEnabled =
        !!activeSkinWeb.sidebarSearchPopup && !!onSidebarSearchGameSelect;
      if (sidebarSearchPopupEnabled) {
        estimatedItems += 1;
      }
      const hasCollectionShortcuts =
        collectionShortcuts.length > 0 && !!onSelectCollectionShortcut;
      const gamesShortcutsSectionVisible =
        hasCollectionShortcuts ||
        (!!libraryForGamesSidebar && ownedGamesInGamesSidebar);
      if (gamesShortcutsSectionVisible) {
        estimatedItems += 1;
        if (ownedGamesInGamesSidebar && libraryForGamesSidebar) {
          estimatedItems += 2;
        }
        estimatedItems += collectionShortcuts.length;
      }
      const minButtonsWidth = estimatedItems * 110;
      setIsNarrow(availableWidth < minButtonsWidth);
      setLibrariesBarLayoutReady(true);
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

    const safetyLayoutReadyId = window.setTimeout(() => {
      setLibrariesBarLayoutReady(true);
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(safetyLayoutReadyId);
      resizeObserver?.disconnect();
      window.clearTimeout(timeoutId);
      cancelAnimationFrame(rafOuter);
      window.removeEventListener("resize", checkWidth);
    };
  }, [
    mainNavPageLibraries,
    viewMode,
    coverSize,
    activeLibrary,
    activeSkinWeb.libraryPagesVerticalList,
    activeSkinWeb.sidebarSearchPopup,
    onSidebarSearchGameSelect,
    onSelectCollectionShortcut,
    ownedGamesInGamesSidebar,
    libraryForGamesSidebar,
    collectionShortcuts.length,
  ]);

  const comboboxSelectValue = useMemo(() => {
    if (
      activeCollectionShortcutId != null &&
      onSelectCollectionShortcut &&
      collectionShortcuts.some((c) => c.id === activeCollectionShortcutId)
    ) {
      return `${COMBOBOX_COLLECTION_SHORTCUT_PREFIX}${activeCollectionShortcutId}`;
    }
    return (activeLibrary ?? libraries[0])?.key ?? "";
  }, [
    activeCollectionShortcutId,
    onSelectCollectionShortcut,
    collectionShortcuts,
    activeLibrary,
    libraries,
  ]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v.startsWith(COMBOBOX_COLLECTION_SHORTCUT_PREFIX)) {
      const id = v.slice(COMBOBOX_COLLECTION_SHORTCUT_PREFIX.length);
      onSelectCollectionShortcut?.(id);
      return;
    }
    const selectedLibrary = libraries.find((lib) => lib.key === v);
    if (selectedLibrary) {
      onSelectLibrary(selectedLibrary);
    }
  };

  const showIconCluster =
    (hasBackground && !hideBackgroundToggle) ||
    (showNewGamesToggle && !!onShowNewGamesChange) ||
    (showMainGamesToggle && !!onMainGamesOnlyChange);

  const showSidebarSearchPopup =
    activeSkinWeb.sidebarSearchPopup &&
    !isNarrow &&
    librariesBarLayoutReady &&
    !!onSidebarSearchGameSelect;

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
        
        {libraries.length > 0 && (
          <>
            {!librariesBarLayoutReady && !activeSkinWeb.libraryPagesVerticalList ? (
              <div
                className="mhg-libraries-bar-measure-hold"
                aria-hidden
                aria-busy="true"
                style={{ minHeight: 64, visibility: "hidden" }}
              />
            ) : isNarrow ? (
              <div className="mhg-libraries-combobox-container">
                {isLoading && libraries.length === 0 ? null : (
                  <select
                    id="libraries-select"
                    name="library"
                    className="mhg-libraries-combobox"
                    value={comboboxSelectValue}
                    onChange={handleSelectChange}
                  >
                    {comboboxLibraries.map((s) => (
                      <option key={s.key} value={s.key}>
                        {ownedGamesInGamesSidebar && s.key === "library"
                          ? t("libraries.ownedGames")
                          : s.title || t(`libraries.${s.key}`)}
                      </option>
                    ))}
                    {collectionShortcuts.length > 0 &&
                      onSelectCollectionShortcut &&
                      collectionShortcuts.map((c) => (
                        <option
                          key={`mhg-combobox-collection-${c.id}`}
                          value={`${COMBOBOX_COLLECTION_SHORTCUT_PREFIX}${c.id}`}
                        >
                          {c.title}
                        </option>
                      ))}
                  </select>
                )}
                {error && <div className="mhg-libraries-error">{error}</div>}
              </div>
            ) : (
              <div className="mhg-libraries-container">
                {isLoading && libraries.length === 0 ? null : (
                  mainNavPageLibraries.map((s) => (
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
                {showSidebarSearchPopup && (
                  <button
                    type="button"
                    data-mhg-sidebar-action="search"
                    className={`mhg-library-button mhg-sidebar-search-trigger flex min-w-0 items-center gap-2 text-left ${
                      sidebarSearchOpen ? "mhg-sidebar-search-trigger--open" : ""
                    }`}
                    aria-expanded={sidebarSearchOpen}
                    aria-controls="mhg-sidebar-search-dialog"
                    onClick={() => setSidebarSearchOpen(true)}
                  >
                    <span className="mhg-library-button-label min-w-0 flex-1 truncate">
                      {t("libraries.sidebarSearch")}
                    </span>
                  </button>
                )}
                {showGamesShortcutsSection && (
                  <div className="mhg-collections-shortcuts">
                    <button
                      type="button"
                      className="mhg-collections-shortcuts-title flex w-full min-w-0 items-center justify-between gap-2 border-0 bg-transparent py-1.5 text-left font-[inherit]"
                      aria-expanded={gamesSidebarExpanded}
                      onClick={() => setGamesSidebarExpanded((v) => !v)}
                    >
                      <span className="mhg-collections-shortcuts-heading-text min-w-0 flex-1 truncate">
                        {t(
                          activeSkinWeb.collectionsShortcutList
                            ? "libraries.gamesSidebar"
                            : "libraries.collections"
                        )}
                      </span>
                      <span
                        className={`mhg-collections-shortcuts-chevron${
                          gamesSidebarExpanded
                            ? " mhg-collections-shortcuts-chevron--expanded"
                            : ""
                        }`}
                        aria-hidden
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </span>
                    </button>
                    {gamesSidebarExpanded && (
                      <>
                        {ownedGamesInGamesSidebar && libraryForGamesSidebar && (
                          <button
                            type="button"
                            data-mhg-library-key="library"
                            className={`mhg-library-button flex min-w-0 items-center gap-2 text-left${
                              showLibraryActiveHighlight &&
                              activeLibrary?.key === "library" &&
                              activeCollectionShortcutId == null &&
                              currentLibraryFilterField !== "installed"
                                ? " mhg-library-active"
                                : ""
                            }`}
                            onClick={() => {
                              window.localStorage.setItem("libraryFilterField", "all");
                              window.dispatchEvent(
                                new CustomEvent("mhg-set-list-filter", {
                                  detail: { prefix: "library", filterField: "all" },
                                })
                              );
                              setCurrentLibraryFilterField("all");
                              onSelectLibrary(libraryForGamesSidebar);
                            }}
                          >
                            <span className="mhg-library-button-label min-w-0 flex-1 truncate">
                              {t("libraries.ownedGames")}
                            </span>
                            {libraryGamesCount > 0 && (
                              <span className="mhg-library-button-count">
                                {libraryGamesCount}
                              </span>
                            )}
                          </button>
                        )}
                        {ownedGamesInGamesSidebar && libraryForGamesSidebar && (
                          <button
                            type="button"
                            data-mhg-library-key="library-installed"
                            className={`mhg-library-button flex min-w-0 items-center gap-2 text-left${
                              showLibraryActiveHighlight &&
                              activeLibrary?.key === "library" &&
                              activeCollectionShortcutId == null &&
                              currentLibraryFilterField === "installed"
                                ? " mhg-library-active"
                                : ""
                            }`}
                            onClick={() => {
                              window.localStorage.setItem("libraryFilterField", "installed");
                              window.dispatchEvent(
                                new CustomEvent("mhg-set-list-filter", {
                                  detail: { prefix: "library", filterField: "installed" },
                                })
                              );
                              setCurrentLibraryFilterField("installed");
                              onSelectLibrary(libraryForGamesSidebar);
                            }}
                          >
                            <span className="mhg-library-button-label min-w-0 flex-1 truncate">
                              {t("libraries.installedGames")}
                            </span>
                            {installedGamesCount > 0 && (
                              <span className="mhg-library-button-count">
                                {installedGamesCount}
                              </span>
                            )}
                          </button>
                        )}
                        {collectionShortcuts.length > 0 &&
                          onSelectCollectionShortcut &&
                          collectionShortcuts.map((collection) => {
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
                      </>
                    )}
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
      {showSidebarSearchPopup && (
        <SidebarSearchOverlay
          open={sidebarSearchOpen}
          onClose={() => setSidebarSearchOpen(false)}
          games={sidebarSearchGames}
          collections={sidebarSearchCollections}
          developers={sidebarSearchDevelopers}
          publishers={sidebarSearchPublishers}
          onGameSelect={onSidebarSearchGameSelect}
          onPlay={onSidebarSearchPlay}
        />
      )}
    </div>
  );
}
