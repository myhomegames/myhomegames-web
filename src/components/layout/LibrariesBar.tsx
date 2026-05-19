import { useState, useLayoutEffect, useRef, useMemo, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import Logo from "../common/Logo";
import ActivitySpinner from "./ActivitySpinner";
import { useTopDockSlot } from "../../contexts/TopDockSlotContext";
import { playFixedFocalStepSound } from "../../utils/fixedFocalStepSound";

type CollectionShortcut = {
  id: string;
  title: string;
};

/** `overflow-y` that establishes a vertical scrollport (not `visible` / clip quirks). */
function isVerticalScrollport(el: HTMLElement): boolean {
  const oy = getComputedStyle(el).overflowY;
  if (oy !== "auto" && oy !== "scroll") return false;
  return el.scrollHeight > el.clientHeight + 2;
}

function scrollOverflowRange(el: HTMLElement): number {
  return Math.max(0, el.scrollHeight - el.clientHeight);
}

/** Nesting depth from `el` up to `root` (exclusive); `root` → 0. */
function depthUnderRoot(el: HTMLElement, root: HTMLElement): number {
  let d = 0;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    d++;
    n = n.parentElement;
  }
  return n === root ? d : -1;
}

/**
 * Main list pages use `.home-page-scroll-container`; with vertical covers the *list rail* often
 * scrolls on an inner element. Prefer the scrollport with the largest overflow range, then the
 * deeper node so we do not move a shallow “page” strip while the cover column stays stuck.
 */
function pickWheelScrollTarget(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const outer =
    document.querySelector<HTMLElement>("#root .home-page-main-container .home-page-scroll-container") ??
    document.querySelector<HTMLElement>("#root .home-page-scroll-container");
  if (!outer) return null;

  const candidates = new Set<HTMLElement>([outer]);

  const pageRoot = outer.closest(".mhg-vertical-covers-page, .mhg-library-vertical-covers");
  if (pageRoot) {
    for (const el of pageRoot.querySelectorAll<HTMLElement>(
      ".virtualized-list-fade, .games-list-container:not(.games-list-container--virtualized)"
    )) {
      if (outer.contains(el)) candidates.add(el);
    }
  }

  const innerSelectors = [
    ".fixed-focal-games-list",
    ".fixed-focal-tag-list",
    ".fixed-focal-collections-list",
    ".virtualized-games-grid",
    ".virtualized-collections-grid",
    ".games-table-scroll",
    ".scrollable-section-scroll",
    ".virtualized-list-fade",
    ".collections-list-container--virtualized .virtualized-list-fade",
  ];
  for (const sel of innerSelectors) {
    outer.querySelectorAll<HTMLElement>(sel).forEach((el) => candidates.add(el));
  }

  for (const el of outer.querySelectorAll<HTMLElement>("div[style]")) {
    if (/overflow\s*:\s*(auto|scroll)/i.test(el.getAttribute("style") ?? "")) {
      candidates.add(el);
    }
  }

  const scrollports = [...candidates].filter(isVerticalScrollport);
  if (scrollports.length === 0) return outer;

  scrollports.sort((a, b) => {
    const ra = scrollOverflowRange(a);
    const rb = scrollOverflowRange(b);
    if (Math.abs(ra - rb) > 48) return rb - ra;
    return depthUnderRoot(b, outer) - depthUnderRoot(a, outer);
  });

  return scrollports[0] ?? outer;
}

/** `<option>` value prefix for collection shortcuts (avoids collisions with `library.key`). */
const COMBOBOX_COLLECTION_SHORTCUT_PREFIX = "mhg:collection:";
/** Two distinct entries (all vs installed) when `ownedGamesFirstInGamesSidebar` moves the library into the Games menu. */
const COMBOBOX_LIBRARY_FILTER_PREFIX = "mhg:libraryFilter:";

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
  /** Opens Add Game modal from shell/header flow when available. */
  onAddGameClick?: () => void;
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
  /** Optional controls rendered in the icon cluster before MainGamesToggle. */
  rightActionsBeforeMainGames?: ReactNode;
  /** Optional extra controls rendered in the right actions area. */
  rightActions?: ReactNode;
  /**
   * When true, this instance owns the page-toolbar portal slot used by the
   * `topRightToolDock` skin option, exposing its DOM node via
   * `TopDockSlotContext`. Only the shell-level `LibrariesBar` (the one
   * rendered above `<Outlet />` in `MainAppLayout`) should set this to true;
   * page-level `LibrariesBar` instances (e.g. inside `LibraryItemDetailPage`,
   * `TagGamesPage`, `HomePageClassic`, `GameDetail`, `IGDBGameDetailPage`)
   * must leave it false so they don't overwrite the canonical slot in the
   * shared context (and reset it to `null` when they unmount on navigation).
   */
  registerTopDockSlot?: boolean;
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
  onAddGameClick,
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
  rightActionsBeforeMainGames,
  rightActions,
  registerTopDockSlot = false,
}: LibrariesBarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { registerSlot: registerSlotInContext } = useTopDockSlot();
  /**
   * Only the shell-level instance forwards its slot to the context. Non-owners
   * receive a no-op ref so they can render the slot div for layout/CSS parity
   * without ever touching the shared `slotEl` state.
   */
  const registerTopDockToolbarSlot = registerTopDockSlot
    ? registerSlotInContext
    : undefined;
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

  /** With sidebar collection shortcuts, hide the “all collections” overview row (no top-level Collections tab). */
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

  const hasCollectionShortcutsUi =
    collectionShortcuts.length > 0 && !!onSelectCollectionShortcut;

  /**
   * Vertical bar (persistent sidebar): “Owned games” / “Installed” stay inside the collapsible Games block.
   * Horizontal bar (e.g. Plex): those two entries are inline with the other page tabs; this block
   * only holds collection shortcuts (when enabled).
   */
  const showCollapsibleGamesSection =
    hasCollectionShortcutsUi ||
    (!!libraryForGamesSidebar &&
      ownedGamesInGamesSidebar &&
      activeSkinWeb.libraryPagesVerticalList);

  const inlineOwnedGamesInBar =
    !!libraryForGamesSidebar &&
    ownedGamesInGamesSidebar &&
    !activeSkinWeb.libraryPagesVerticalList;

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
   * Horizontal bar: first render uses `isNarrow === false` and would show the full inline list;
   * `useLayoutEffect` then switches to the combobox → visible flash.
   * Hide bar content until measured (before paint). Not needed when `libraryPagesVerticalList`
   * is true (no combobox).
   */
  const [librariesBarLayoutReady, setLibrariesBarLayoutReady] = useState(
    () => activeSkinWeb.libraryPagesVerticalList
  );
  const isFirstLibrariesLayoutRef = useRef(true);
  const prevCollectionShortcutCountRef = useRef(collectionShortcuts.length);
  const prevOwnedGamesInSidebarRef = useRef(ownedGamesInGamesSidebar);
  const [sidebarSearchOpen, setSidebarSearchOpen] = useState(false);
  /** Collapsible Games / collections sidebar block (sidebar skin: full-width row + chevron). */
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
      const ownedGamesInSidebarChanged =
        prevOwnedGamesInSidebarRef.current !== ownedGamesInGamesSidebar;
      if (
        isFirstLibrariesLayoutRef.current ||
        shortcutCountChanged ||
        ownedGamesInSidebarChanged
      ) {
        setLibrariesBarLayoutReady(false);
        prevCollectionShortcutCountRef.current = collectionShortcuts.length;
        prevOwnedGamesInSidebarRef.current = ownedGamesInGamesSidebar;
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
       * Estimate minimum width to fit all inline bar items. Besides main page tabs, count the
       * sidebar search trigger when present, and the Games / Collections block (heading plus
       * optional “Owned games” / “Installed” and collection shortcuts). On horizontal skins
       * (e.g. Plex) this ensures collection count is not ignored when choosing combobox mode.
       */
      let estimatedItems = mainNavPageLibraries.length;
      const sidebarSearchPopupEnabled =
        !!activeSkinWeb.sidebarSearchPopup && !!onSidebarSearchGameSelect;
      if (sidebarSearchPopupEnabled) {
        estimatedItems += 1;
      }
      const hasCollectionShortcuts =
        collectionShortcuts.length > 0 && !!onSelectCollectionShortcut;
      const collapsibleGamesBlockVisible =
        hasCollectionShortcuts ||
        (!!libraryForGamesSidebar &&
          ownedGamesInGamesSidebar &&
          activeSkinWeb.libraryPagesVerticalList);
      const inlineOwnedGamesButtons =
        !!libraryForGamesSidebar &&
        ownedGamesInGamesSidebar &&
        !activeSkinWeb.libraryPagesVerticalList;
      if (inlineOwnedGamesButtons) {
        estimatedItems += 2;
      }
      if (collapsibleGamesBlockVisible) {
        estimatedItems += 1;
        if (
          activeSkinWeb.libraryPagesVerticalList &&
          ownedGamesInGamesSidebar &&
          libraryForGamesSidebar
        ) {
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
    if (
      ownedGamesInGamesSidebar &&
      libraryForGamesSidebar &&
      activeLibrary?.key === "library" &&
      activeCollectionShortcutId == null
    ) {
      return currentLibraryFilterField === "installed"
        ? `${COMBOBOX_LIBRARY_FILTER_PREFIX}installed`
        : `${COMBOBOX_LIBRARY_FILTER_PREFIX}all`;
    }
    return (activeLibrary ?? libraries[0])?.key ?? "";
  }, [
    activeCollectionShortcutId,
    onSelectCollectionShortcut,
    collectionShortcuts,
    activeLibrary,
    libraries,
    ownedGamesInGamesSidebar,
    libraryForGamesSidebar,
    currentLibraryFilterField,
  ]);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    if (v.startsWith(COMBOBOX_LIBRARY_FILTER_PREFIX)) {
      const suffix = v.slice(COMBOBOX_LIBRARY_FILTER_PREFIX.length);
      if (suffix === "all" || suffix === "installed") {
        const filterField = suffix === "installed" ? "installed" : "all";
        const isActive =
          activeLibrary?.key === "library" &&
          activeCollectionShortcutId == null &&
          currentLibraryFilterField === filterField;
        if (!isActive && activeSkinWeb.fixedFocalStepSound) {
          playFixedFocalStepSound();
        }
        window.localStorage.setItem("libraryFilterField", filterField);
        window.dispatchEvent(
          new CustomEvent("mhg-set-list-filter", {
            detail: { prefix: "library", filterField },
          })
        );
        setCurrentLibraryFilterField(filterField);
        if (libraryForGamesSidebar) {
          onSelectLibrary(libraryForGamesSidebar);
        }
      }
      return;
    }
    if (v.startsWith(COMBOBOX_COLLECTION_SHORTCUT_PREFIX)) {
      const id = v.slice(COMBOBOX_COLLECTION_SHORTCUT_PREFIX.length);
      if (activeCollectionShortcutId !== id && activeSkinWeb.fixedFocalStepSound) {
        playFixedFocalStepSound();
      }
      onSelectCollectionShortcut?.(id);
      return;
    }
    const selectedLibrary = libraries.find((lib) => lib.key === v);
    if (selectedLibrary) {
      const isActive =
        activeCollectionShortcutId == null && activeLibrary?.key === selectedLibrary.key;
      if (!isActive && activeSkinWeb.fixedFocalStepSound) {
        playFixedFocalStepSound();
      }
      onSelectLibrary(selectedLibrary);
    }
  };

  const hoverSelectEnabled = activeSkinWeb.libraryHoverSelect;
  const stepSoundEnabled = activeSkinWeb.fixedFocalStepSound;

  const playBarStepSound = useCallback(() => {
    if (stepSoundEnabled) playFixedFocalStepSound();
  }, [stepSoundEnabled]);

  const isLibraryPageActive = useCallback(
    (libraryKey: string, filterField?: "all" | "installed") => {
      if (activeCollectionShortcutId != null) return false;
      if (activeLibrary?.key !== libraryKey) return false;
      if (filterField === "installed") return currentLibraryFilterField === "installed";
      if (filterField === "all") return currentLibraryFilterField !== "installed";
      return true;
    },
    [activeCollectionShortcutId, activeLibrary?.key, currentLibraryFilterField],
  );

  const applyLibraryFilter = useCallback((filterField: "all" | "installed") => {
    window.localStorage.setItem("libraryFilterField", filterField);
    window.dispatchEvent(
      new CustomEvent("mhg-set-list-filter", {
        detail: { prefix: "library", filterField },
      }),
    );
    setCurrentLibraryFilterField(filterField);
  }, []);

  const selectLibraryPage = useCallback(
    (library: GameLibrarySection, opts?: { filterField?: "all" | "installed" }) => {
      const filterField = opts?.filterField;
      const isActive = filterField
        ? isLibraryPageActive(library.key, filterField)
        : isLibraryPageActive(library.key);
      if (isActive) return;
      playBarStepSound();
      if (filterField) applyLibraryFilter(filterField);
      onSelectLibrary(library);
    },
    [applyLibraryFilter, isLibraryPageActive, onSelectLibrary, playBarStepSound],
  );

  const selectCollectionShortcutEntry = useCallback(
    (collectionId: string) => {
      if (activeCollectionShortcutId === collectionId) return;
      playBarStepSound();
      onSelectCollectionShortcut?.(collectionId);
    },
    [activeCollectionShortcutId, onSelectCollectionShortcut, playBarStepSound],
  );

  const navigateFromBar = useCallback(
    (path: string, isAlreadyActive: boolean) => {
      if (!isAlreadyActive) playBarStepSound();
      navigate(path);
    },
    [navigate, playBarStepSound],
  );

  const handleLibraryHoverSelect = (
    library: GameLibrarySection,
    filterField?: "all" | "installed",
  ) => {
    if (!hoverSelectEnabled) return;
    selectLibraryPage(library, filterField ? { filterField } : undefined);
  };

  const handleCollectionShortcutHoverSelect = (collectionId: string) => {
    if (!hoverSelectEnabled) return;
    if (!onSelectCollectionShortcut) return;
    selectCollectionShortcutEntry(collectionId);
  };

  const topRightToolDock = activeSkinWeb.topRightToolDock;

  const showIconCluster =
    (hasBackground && !hideBackgroundToggle) ||
    (!!rightActionsBeforeMainGames && !topRightToolDock) ||
    (showNewGamesToggle && !!onShowNewGamesChange && !topRightToolDock) ||
    (showMainGamesToggle && !!onMainGamesOnlyChange && !topRightToolDock);

  const showSidebarSearchPopup =
    activeSkinWeb.sidebarSearchPopup &&
    !isNarrow &&
    librariesBarLayoutReady &&
    !!onSidebarSearchGameSelect;

  /* On /collections/:id, highlight only the collection, not a “page” tab as well */
  const showLibraryActiveHighlight = activeCollectionShortcutId == null;

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    const updateActiveIconLine = () => {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      const activeButton = containerEl.querySelector(".mhg-library-active") as HTMLElement | null;
      if (!activeButton) return;
      const rect = activeButton.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      document.documentElement.style.setProperty("--mhg-active-library-icon-center-x", `${centerX}px`);
    };
    updateActiveIconLine();
    const onResize = () => updateActiveIconLine();
    window.addEventListener("resize", onResize);
    const t = window.setTimeout(updateActiveIconLine, 60);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t);
    };
  }, [pathname, activeLibrary?.key, activeCollectionShortcutId, libraries.length]);

  useEffect(() => {
    if (!activeSkinWeb.verticalCoverAlignment) return;
    const strip = containerRef.current;
    if (!strip) return;

    const onWheel = (e: WheelEvent) => {
      if (!strip.contains(e.target as Node)) return;
      const el = e.target as Element | null;
      if (el?.closest?.(".dropdown-menu-popup")) return;
      if (el?.closest?.("input[type=range], textarea, [contenteditable=true]")) return;

      const libRow = strip.querySelector<HTMLElement>(".mhg-libraries-container");
      if (
        libRow &&
        Math.abs(e.deltaX) > Math.abs(e.deltaY) &&
        libRow.scrollWidth > libRow.clientWidth + 1
      ) {
        return;
      }

      const fixedFocal =
        document.querySelector<HTMLElement>(
          "#root .fixed-focal-games-list, #root .fixed-focal-tag-list, #root .fixed-focal-collections-list",
        );
      if (fixedFocal) {
        e.preventDefault();
        document.dispatchEvent(
          new CustomEvent("mhg:fixed-focal-step", {
            detail: { direction: (e.deltaY > 0 ? 1 : -1) as 1 | -1 },
          }),
        );
        return;
      }

      const mainScroll = pickWheelScrollTarget();
      if (!mainScroll) return;

      e.preventDefault();

      if (
        mainScroll.classList.contains("virtualized-games-grid") ||
        mainScroll.classList.contains("virtualized-collections-grid")
      ) {
        mainScroll.dispatchEvent(
          new WheelEvent("wheel", {
            deltaY: e.deltaY,
            deltaX: e.deltaX,
            bubbles: true,
            cancelable: true,
          }),
        );
        return;
      }

      mainScroll.scrollTop += e.deltaY;
    };

    strip.addEventListener("wheel", onWheel, { passive: false });
    return () => strip.removeEventListener("wheel", onWheel);
  }, [activeSkinWeb.verticalCoverAlignment]);

  /** Top-strip layout only; full sidebars ship column layout in skin CSS. */
  const verticalPageTabsLayout =
    activeSkinWeb.libraryPagesVerticalList && !activeSkinWeb.persistentLibraryShell;
  const showHeaderActionsInLibrariesBar = activeSkinWeb.libraryBarHeaderActions;
  const showAddGameInLibrariesBar = showHeaderActionsInLibrariesBar;
  const isAddGameRoute = pathname === "/add-game";
  const isSettingsRoute = pathname === "/settings";
  const isProfileRoute = pathname === "/profile";

  return (
    <div
      className={[
        "mhg-libraries-bar",
        verticalPageTabsLayout ? "mhg-libraries-bar--vertical-page-tabs" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      {...{
        ...(activeSkinWeb.libraryPagesVerticalList
          ? { "data-mhg-library-pages-vertical-list": "true" }
          : {}),
        ...(showHeaderActionsInLibrariesBar
          ? { "data-mhg-library-bar-header-actions": "true" }
          : {}),
        ...(topRightToolDock ? { "data-mhg-top-right-tool-dock": "true" } : {}),
      }}
    >
      {topRightToolDock && (
        <div
          className="mhg-top-right-tool-dock"
          role="toolbar"
          aria-label={t("libraries.topRightToolDock", "Top tools")}
        >
          <div className="mhg-top-right-tool-dock-inner">
            <button
              type="button"
              className="mhg-top-right-tool-dock-logo mhg-logo-button"
              onClick={() => navigate("/")}
              aria-label={t("header.home")}
            >
              <Logo />
            </button>
            <ActivitySpinner
              isLoading={globalLoading}
              className="mhg-top-right-tool-dock-activity-spinner"
            />
            <div className="mhg-top-right-tool-dock-page-toolbar-slot">
              <div
                className="mhg-top-right-tool-dock-page-toolbar-inner"
                ref={registerTopDockToolbarSlot}
              />
            </div>
            {onViewModeChange && (
              <div className="mhg-top-right-tool-dock-view mhg-libraries-actions-view-mode-container">
                <ViewModeSelector
                  value={viewMode}
                  onChange={onViewModeChange}
                  disabled={!activeLibrary || activeLibrary.key !== "library"}
                />
              </div>
            )}
            {onCoverSizeChange && (
              <div
                className={`mhg-top-right-tool-dock-slider mhg-libraries-actions-slider-container ${
                  viewMode === "grid" ? "" : "hidden"
                }`}
              >
                <CoverSizeSlider value={coverSize} onChange={onCoverSizeChange} />
              </div>
            )}
            {rightActionsBeforeMainGames ? (
              <div className="mhg-top-right-tool-dock-before-main-games mhg-libraries-actions-before-main-games">
                {rightActionsBeforeMainGames}
              </div>
            ) : null}
            {topRightToolDock && showNewGamesToggle && onShowNewGamesChange && (
              <div className="mhg-top-right-tool-dock-new-games mhg-libraries-actions-new-games-container">
                <div className="library-item-detail-compact-top-action">
                  <NewGamesToggle
                    showNewGames={showNewGames}
                    onChange={onShowNewGamesChange}
                  />
                </div>
              </div>
            )}
            {showMainGamesToggle && onMainGamesOnlyChange && (
              <div className="mhg-top-right-tool-dock-main-games mhg-libraries-actions-main-games-container">
                <MainGamesToggle
                  mainGamesOnly={mainGamesOnly}
                  onChange={onMainGamesOnlyChange}
                />
              </div>
            )}
            {API_BASE && getApiToken() && (
              <div className="mhg-top-right-tool-dock-menu">
                <DropdownMenu
                  className="mhg-libraries-menu-dropdown mhg-top-right-tool-dock-menu-dropdown"
                  onReload={onReloadMetadata}
                />
              </div>
            )}
          </div>
        </div>
      )}
      <div className="mhg-libraries-bar-container" ref={containerRef}>
        {/* Menu dropdown bottom-left (hidden when using fixed top-right dock) */}
        {!topRightToolDock && API_BASE && getApiToken() && (
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
                    {comboboxLibraries.flatMap((s) => {
                      if (
                        ownedGamesInGamesSidebar &&
                        s.key === "library" &&
                        libraryForGamesSidebar
                      ) {
                        return [
                          <option
                            key="mhg-combobox-library-all"
                            value={`${COMBOBOX_LIBRARY_FILTER_PREFIX}all`}
                          >
                            {t("libraries.ownedGames")}
                            {libraryGamesCount > 0 ? ` ${libraryGamesCount}` : ""}
                          </option>,
                          <option
                            key="mhg-combobox-library-installed"
                            value={`${COMBOBOX_LIBRARY_FILTER_PREFIX}installed`}
                          >
                            {t("libraries.installedGames")}
                            {installedGamesCount > 0 ? ` ${installedGamesCount}` : ""}
                          </option>,
                        ];
                      }
                      return [
                        <option key={s.key} value={s.key}>
                          {s.title || t(`libraries.${s.key}`)}
                        </option>,
                      ];
                    })}
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
                {/* Same order as combobox: library (all / installed) before other page tabs */}
                {inlineOwnedGamesInBar && libraryForGamesSidebar && (
                  <>
                    <button
                      type="button"
                      data-mhg-library-key="library"
                      className={`mhg-library-button flex min-w-0 shrink-0 items-center gap-2 text-left${
                        showLibraryActiveHighlight &&
                        activeLibrary?.key === "library" &&
                        activeCollectionShortcutId == null &&
                        currentLibraryFilterField !== "installed"
                          ? " mhg-library-active"
                          : ""
                      }`}
                      onClick={() => selectLibraryPage(libraryForGamesSidebar, { filterField: "all" })}
                      onMouseEnter={() => handleLibraryHoverSelect(libraryForGamesSidebar, "all")}
                    >
                      <span className="mhg-library-button-label min-w-0 flex-1 truncate">
                        {t("libraries.ownedGames")}
                      </span>
                      {libraryGamesCount > 0 && (
                        <span className="mhg-library-button-count">{libraryGamesCount}</span>
                      )}
                    </button>
                    <button
                      type="button"
                      data-mhg-library-key="library-installed"
                      className={`mhg-library-button flex min-w-0 shrink-0 items-center gap-2 text-left${
                        showLibraryActiveHighlight &&
                        activeLibrary?.key === "library" &&
                        activeCollectionShortcutId == null &&
                        currentLibraryFilterField === "installed"
                          ? " mhg-library-active"
                          : ""
                      }`}
                      onClick={() =>
                        selectLibraryPage(libraryForGamesSidebar, { filterField: "installed" })
                      }
                      onMouseEnter={() =>
                        handleLibraryHoverSelect(libraryForGamesSidebar, "installed")
                      }
                    >
                      <span className="mhg-library-button-label min-w-0 flex-1 truncate">
                        {t("libraries.installedGames")}
                      </span>
                      {installedGamesCount > 0 && (
                        <span className="mhg-library-button-count">{installedGamesCount}</span>
                      )}
                    </button>
                  </>
                )}
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
                      onClick={() => selectLibraryPage(s)}
                      onMouseEnter={() => handleLibraryHoverSelect(s)}
                    >
                      <span className="mhg-library-button-label min-w-0 flex-1 truncate">
                        {s.title || t(`libraries.${s.key}`)}
                      </span>
                    </button>
                  ))
                )}
                {showAddGameInLibrariesBar && (
                  <button
                    type="button"
                    data-mhg-library-key="mhg-header-add-game"
                    className={`mhg-library-button flex min-w-0 items-center gap-2 text-left ${
                      isAddGameRoute ? "mhg-library-active" : ""
                    }`}
                    onClick={() => {
                      if (onAddGameClick) {
                        if (!isAddGameRoute) playBarStepSound();
                        onAddGameClick();
                      } else {
                        navigateFromBar("/add-game", isAddGameRoute);
                      }
                    }}
                  >
                    <span className="mhg-library-button-label min-w-0 flex-1 truncate">
                      {t("header.addGame")}
                    </span>
                  </button>
                )}
                {showHeaderActionsInLibrariesBar && (
                  <button
                    type="button"
                    data-mhg-library-key="mhg-header-settings"
                    className={`mhg-library-button flex min-w-0 items-center gap-2 text-left ${
                      isSettingsRoute ? "mhg-library-active" : ""
                    }`}
                    onClick={() => navigateFromBar("/settings", isSettingsRoute)}
                  >
                    <span className="mhg-library-button-label min-w-0 flex-1 truncate">
                      {t("header.settings")}
                    </span>
                  </button>
                )}
                {showHeaderActionsInLibrariesBar && (
                  <button
                    type="button"
                    data-mhg-library-key="mhg-header-profile"
                    className={`mhg-library-button flex min-w-0 items-center gap-2 text-left ${
                      isProfileRoute ? "mhg-library-active" : ""
                    }`}
                    onClick={() => navigateFromBar("/profile", isProfileRoute)}
                  >
                    <span className="mhg-library-button-label min-w-0 flex-1 truncate">
                      {t("header.profile")}
                    </span>
                  </button>
                )}
                {showSidebarSearchPopup && (
                  <button
                    type="button"
                    data-mhg-library-key="mhg-header-search"
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
                {showCollapsibleGamesSection && (
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
                        {activeSkinWeb.libraryPagesVerticalList &&
                          ownedGamesInGamesSidebar &&
                          libraryForGamesSidebar && (
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
                              onClick={() =>
                                selectLibraryPage(libraryForGamesSidebar, { filterField: "all" })
                              }
                              onMouseEnter={() =>
                                handleLibraryHoverSelect(libraryForGamesSidebar, "all")
                              }
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
                        {activeSkinWeb.libraryPagesVerticalList &&
                          ownedGamesInGamesSidebar &&
                          libraryForGamesSidebar && (
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
                              onClick={() =>
                                selectLibraryPage(libraryForGamesSidebar, {
                                  filterField: "installed",
                                })
                              }
                              onMouseEnter={() =>
                                handleLibraryHoverSelect(libraryForGamesSidebar, "installed")
                              }
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
                                onClick={() => selectCollectionShortcutEntry(collection.id)}
                                onMouseEnter={() =>
                                  handleCollectionShortcutHoverSelect(collection.id)
                                }
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
              {rightActionsBeforeMainGames && !topRightToolDock ? (
                <div className="mhg-libraries-actions-before-main-games">
                  {rightActionsBeforeMainGames}
                </div>
              ) : null}
              {showMainGamesToggle && onMainGamesOnlyChange && !topRightToolDock && (
                <div className="mhg-libraries-actions-main-games-container">
                  <MainGamesToggle
                    mainGamesOnly={mainGamesOnly}
                    onChange={onMainGamesOnlyChange}
                  />
                </div>
              )}
            </div>
          ) : null}
          {!topRightToolDock && onCoverSizeChange && (
            <div
              className={`mhg-libraries-actions-slider-container ${
                viewMode === "grid" ? "" : "hidden"
              }`}
            >
              <CoverSizeSlider value={coverSize} onChange={onCoverSizeChange} />
            </div>
          )}
          {!topRightToolDock && onViewModeChange && (
            <div className="mhg-libraries-actions-view-mode-container">
              <ViewModeSelector
                value={viewMode}
                onChange={onViewModeChange}
                disabled={!activeLibrary || activeLibrary.key !== "library"}
              />
            </div>
          )}
          {rightActions ? (
            <div className="mhg-libraries-actions-right-extra">
              {rightActions}
            </div>
          ) : null}
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
