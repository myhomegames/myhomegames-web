import { useState, useLayoutEffect, useRef, useMemo, useEffect, useCallback } from "react";
import type { CSSProperties, ReactNode } from "react";
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
import { API_BASE } from "../../config";
import { useSkin } from "../../contexts/SkinContext";
import { useActiveProfile } from "../../hooks/useActiveProfile";
import { useLibrarySidebarLayout } from "../../contexts/LibrarySidebarLayoutContext";
import ProfileDropdown from "./ProfileDropdown";
import { useLibraryGames } from "../../contexts/LibraryGamesContext";
import type { ViewMode, GameLibrarySection, GameItem, CollectionItem } from "../../types";
import SidebarSearchOverlay from "./SidebarSearchOverlay";
import Logo from "../common/Logo";
import ActivitySpinner from "./ActivitySpinner";
import { formatActivityProgressLabel } from "../../utils/activityProgressLabel";
import UpdateNotification from "./UpdateNotification";
import { useTopDockSlot } from "../../contexts/TopDockSlotContext";
import { playFixedFocalStepSound } from "../../utils/fixedFocalStepSound";
import { applyWheelDeltaStep, readWheelStepThresholdPx } from "../../utils/stepScrollSnap";
import {
  CONTEXT_RAIL_LIBRARY_VIEW_TRANSITION,
  contextRailViewTransitionsEnabled,
  isContextRailDetailPathname,
} from "../../utils/contextRailIndexPeek";
import {
  centerActiveLibraryInStrip,
  librariesStripNeedsHorizontalScroll,
  syncLibrariesStripScroll,
  verticalCoverRailScrollLayoutForPath,
} from "../../utils/librariesStripScroll";

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

function findReactWindowScrollport(listRoot: HTMLElement): HTMLElement | null {
  for (const child of listRoot.children) {
    if (!(child instanceof HTMLElement)) continue;
    const oy = getComputedStyle(child).overflowY;
    if (oy === "auto" || oy === "scroll") return child;
  }
  const marked = listRoot.querySelector<HTMLElement>('[style*="overflow"]');
  return marked instanceof HTMLElement ? marked : null;
}

/** Vista Dettaglio: page scroll container or inner react-window scroller. */
function findDetailViewScrollport(outer: HTMLElement): HTMLElement | null {
  if (!outer.classList.contains("detail-view")) return null;

  const virtualizedHost = outer.querySelector<HTMLElement>(
    ".games-list-detail-container--virtualized",
  );
  if (virtualizedHost) {
    const listRoot = virtualizedHost.querySelector<HTMLElement>(".virtualized-games-list-detail");
    if (listRoot) {
      const inner = findReactWindowScrollport(listRoot);
      if (inner) return inner;
    }
  }

  const oy = getComputedStyle(outer).overflowY;
  if (oy === "auto" || oy === "scroll") return outer;
  return null;
}

/** Vista Tabella: inner `.games-table-scroll` or react-window scroller inside it. */
function findTableViewScrollport(outer: HTMLElement): HTMLElement | null {
  if (!outer.classList.contains("table-view")) return null;

  const tableScroll = outer.querySelector<HTMLElement>(".games-table-scroll");
  if (tableScroll) {
    const listRoot = tableScroll.querySelector<HTMLElement>(".virtualized-games-table-list");
    if (listRoot) {
      const inner = findReactWindowScrollport(listRoot.parentElement ?? listRoot);
      if (inner) return inner;
    }
    const oy = getComputedStyle(tableScroll).overflowY;
    if (oy === "auto" || oy === "scroll") return tableScroll;
  }

  return null;
}

/**
 * Main list pages use `.home-page-scroll-container`; with vertical covers the *list rail* often
 * scrolls on an inner element. Prefer the scrollport with the largest overflow range, then the
 * deeper node so we do not move a shallow “page” strip while the cover column stays stuck.
 */
function findFixedFocalWheelTarget(activeLibraryKey: string | null | undefined): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const root = document.querySelector("#root");
  if (!root) return null;

  if (activeLibraryKey === "recommended") {
    const strips = root.querySelector(".fixed-focal-recommended-strips-list");
    if (strips instanceof HTMLElement) return strips;
  }

  const el = root.querySelector(
    ".fixed-focal-games-list, .fixed-focal-tag-list, .fixed-focal-collections-list, .fixed-focal-recommended-strips-list",
  );
  return el instanceof HTMLElement ? el : null;
}

function pickWheelScrollTarget(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const outer =
    document.querySelector<HTMLElement>("#root .home-page-main-container .home-page-scroll-container") ??
    document.querySelector<HTMLElement>("#root .home-page-scroll-container");
  if (!outer) return null;

  const detailScroll = findDetailViewScrollport(outer);
  if (detailScroll) return detailScroll;

  const tableScroll = findTableViewScrollport(outer);
  if (tableScroll) return tableScroll;

  const candidates = new Set<HTMLElement>([outer]);

  const pageRoot = outer.closest(".mhg-vertical-covers-page, .mhg-library-vertical-covers");
  if (pageRoot) {
    for (const el of pageRoot.querySelectorAll<HTMLElement>(
      ".virtualized-list-fade, .games-list-container:not(.games-list-container--virtualized), .games-list-detail-container, .virtualized-games-list-detail"
    )) {
      if (outer.contains(el)) candidates.add(el);
    }
  }

  const innerSelectors = [
    ".fixed-focal-games-list",
    ".fixed-focal-tag-list",
    ".fixed-focal-collections-list",
    ".fixed-focal-recommended-strips-list",
    ".virtualized-games-grid",
    ".virtualized-collections-grid",
    ".virtualized-games-list-detail",
    ".games-list-detail-container",
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

function readCssNumberVar(name: string, fallback: number): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

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
   * `TagGamesPage`, `HomePageClassic`, `GameDetail`, `CatalogGameDetailPage`)
   * must leave it false so they don't overwrite the canonical slot in the
   * shared context (and reset it to `null` when they unmount on navigation).
   */
  registerTopDockSlot?: boolean;
  /** PS3 search results: title block between top dock and library icon strip. */
  betweenDockAndStrip?: ReactNode;
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
  betweenDockAndStrip,
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
  const { showProfile } = useActiveProfile();
  const { collapsibleActive, sidebarOpen, closeSidebar } = useLibrarySidebarLayout();
  const contextRailViewTransitions = contextRailViewTransitionsEnabled(activeSkinWeb);
  const contextRailDetailRoute = isContextRailDetailPathname(pathname);
  const libraryActiveViewTransitionStyle = useCallback(
    (isActive: boolean): CSSProperties | undefined =>
      isActive && contextRailViewTransitions && !contextRailDetailRoute
        ? { viewTransitionName: CONTEXT_RAIL_LIBRARY_VIEW_TRANSITION }
        : undefined,
    [contextRailViewTransitions, contextRailDetailRoute],
  );
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

  const { isLoading: globalLoading, isActivityBusy, activityProgress } = useLoading();
  const activityTooltipText = formatActivityProgressLabel(t, activityProgress);
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
  const [measuredActionsWidth, setMeasuredActionsWidth] = useState(136);

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
      const actionsEl = actionsRef.current;
      if (actionsEl && actionsEl.offsetWidth >= 48) {
        setMeasuredActionsWidth(actionsEl.offsetWidth);
      }

      if (windowWidth < 1024) {
        setIsNarrow(true);
        setLibrariesBarLayoutReady(true);
        return;
      }

      const containerEl = containerRef.current;
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

      // Right-side actions often mount after first paint; keep the bar hidden until measured
      // so we do not briefly show the combobox and then switch to inline tabs.
      if (actionsWidth < 48) {
        requestAnimationFrame(() => {
          if (!cancelled) checkWidth();
        });
        return;
      }

      const menuEl = containerEl.querySelector<HTMLElement>(".mhg-libraries-menu-container");
      const menuReserve = menuEl?.offsetWidth ?? 0;
      const sideReserve = Math.max(menuReserve, 24) + 48;
      const availableWidth = containerWidth - actionsWidth - sideReserve;
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
      const comboboxItemWidth = readCssNumberVar("--mhg-libraries-combobox-item-width", 110);
      const comboboxAnticipation = readCssNumberVar("--mhg-libraries-combobox-anticipation", 0);
      const comboboxHysteresis = readCssNumberVar("--mhg-libraries-combobox-hysteresis", 200);
      const minButtonsWidth = estimatedItems * comboboxItemWidth + comboboxAnticipation;
      const fitsInlineList = availableWidth >= minButtonsWidth;
      setIsNarrow((prev) => {
        if (prev) {
          // Hysteresis: keep combobox until inline tabs clearly fit (avoids left → centered snap).
          return availableWidth < minButtonsWidth + comboboxHysteresis;
        }
        return !fitsInlineList;
      });
      setLibrariesBarLayoutReady(true);
    };

    const containerEl = containerRef.current;
    const actionsEl = actionsRef.current;
    const resizeObserver =
      typeof ResizeObserver !== "undefined" && containerEl
        ? new ResizeObserver(() => {
            checkWidth();
          })
        : null;
    if (resizeObserver && containerEl) {
      resizeObserver.observe(containerEl);
    }
    if (resizeObserver && actionsEl) {
      resizeObserver.observe(actionsEl);
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
      if (collapsibleActive) closeSidebar();
    },
    [applyLibraryFilter, collapsibleActive, closeSidebar, isLibraryPageActive, onSelectLibrary, playBarStepSound],
  );

  const selectCollectionShortcutEntry = useCallback(
    (collectionId: string) => {
      if (activeCollectionShortcutId === collectionId) return;
      playBarStepSound();
      onSelectCollectionShortcut?.(collectionId);
      if (collapsibleActive) closeSidebar();
    },
    [activeCollectionShortcutId, collapsibleActive, closeSidebar, onSelectCollectionShortcut, playBarStepSound],
  );

  const navigateFromBar = useCallback(
    (path: string, isAlreadyActive: boolean) => {
      if (!isAlreadyActive) playBarStepSound();
      navigate(path);
      if (collapsibleActive) closeSidebar();
    },
    [collapsibleActive, closeSidebar, navigate, playBarStepSound],
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

  const syncActiveLibraryIconPosition = useCallback(() => {
    const containerEl = containerRef.current;
    if (!containerEl) return;
    const activeButton = containerEl.querySelector(".mhg-library-active") as HTMLElement | null;
    if (!activeButton) return;
    const rect = activeButton.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const beforeStyle = getComputedStyle(activeButton, "::before");
    const glyphFontSize = parseFloat(beforeStyle.fontSize);
    const glyphHalfWidth =
      Number.isFinite(glyphFontSize) && glyphFontSize > 0 ? glyphFontSize * 0.5 : 26;
    const graphicLeftX = centerX - glyphHalfWidth;
    document.documentElement.style.setProperty("--mhg-active-library-icon-center-x", `${centerX}px`);
    document.documentElement.style.setProperty("--mhg-active-library-icon-center-y", `${centerY}px`);
    document.documentElement.style.setProperty("--mhg-active-library-icon-left-x", `${rect.left}px`);
    document.documentElement.style.setProperty(
      "--mhg-active-library-icon-graphic-left-x",
      `${graphicLeftX}px`,
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;
    syncActiveLibraryIconPosition();
    const onResize = () => syncActiveLibraryIconPosition();
    window.addEventListener("resize", onResize);
    const t = window.setTimeout(syncActiveLibraryIconPosition, 60);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(t);
    };
  }, [pathname, activeLibrary?.key, activeCollectionShortcutId, libraries.length, syncActiveLibraryIconPosition]);

  useEffect(() => {
    if (!activeSkinWeb.verticalCoverAlignment) return;
    if (collapsibleActive && sidebarOpen) return;
    const strip = containerRef.current;
    if (!strip) return;
    const wheelRoot =
      (strip.closest(".mhg-libraries-bar") as HTMLElement | null) ?? strip;

    const wheelAccum = { accumulated: 0 };
    const wheelThresholdPx = readWheelStepThresholdPx(strip);

    const onWheel = (e: WheelEvent) => {
      if (!wheelRoot.contains(e.target as Node)) return;
      const el = e.target as Element | null;
      if (el?.closest?.(".dropdown-menu-popup")) return;
      if (el?.closest?.("input[type=range], textarea, [contenteditable=true]")) return;

      const libRow = strip.querySelector<HTMLElement>(".mhg-libraries-container");
      if (
        libRow &&
        Math.abs(e.deltaX) > Math.abs(e.deltaY) &&
        librariesStripNeedsHorizontalScroll(libRow)
      ) {
        requestAnimationFrame(() => {
          syncLibrariesStripScroll(libRow);
        });
        return;
      }

      const fixedFocal = findFixedFocalWheelTarget(activeLibrary?.key);
      const recommendedStripsActive =
        activeLibrary?.key === "recommended" &&
        !!document.querySelector("#root .fixed-focal-recommended-strips-list");

      if (fixedFocal || recommendedStripsActive) {
        e.preventDefault();
        applyWheelDeltaStep(wheelAccum, e.deltaY, wheelThresholdPx, (direction) => {
          document.dispatchEvent(
            new CustomEvent("mhg:fixed-focal-step", {
              detail: { direction },
            }),
          );
        });
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

    wheelRoot.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => wheelRoot.removeEventListener("wheel", onWheel, { capture: true });
  }, [activeSkinWeb.verticalCoverAlignment, activeLibrary?.key, collapsibleActive, sidebarOpen]);

  /** Top-strip layout only; full sidebars ship column layout in skin CSS. */
  const verticalPageTabsLayout =
    activeSkinWeb.libraryPagesVerticalList && !activeSkinWeb.persistentLibraryShell;
  /** Vertical sidebar list inside the persistent shell — native column scroll, not horizontal strip clamp. */
  const verticalPersistentSidebar =
    activeSkinWeb.persistentLibraryShell && activeSkinWeb.libraryPagesVerticalList;
  const showSidebarLibrariesMenu =
    !topRightToolDock &&
    !!API_BASE &&
    !!onReloadMetadata &&
    !(verticalPersistentSidebar && collapsibleActive);
  const librariesMenuDropdown = showSidebarLibrariesMenu ? (
    <div
      className={`mhg-libraries-menu-container${
        verticalPersistentSidebar ? " mhg-libraries-sidebar-header-tools" : ""
      }`}
    >
      <DropdownMenu
        className="mhg-libraries-menu-dropdown"
        onReload={onReloadMetadata}
      />
    </div>
  ) : null;
  const showHeaderActionsInLibrariesBar = activeSkinWeb.libraryBarHeaderActions;
  const showAddGameInLibrariesBar = showHeaderActionsInLibrariesBar;
  const isAddGameRoute = pathname === "/add-game";
  const isSettingsRoute = pathname === "/settings";
  const showProfileInLibrariesBar = showHeaderActionsInLibrariesBar && showProfile;

  useEffect(() => {
    if (!activeSkinWeb.verticalCoverAlignment || isNarrow || verticalPersistentSidebar) return;
    const row = containerRef.current?.querySelector<HTMLElement>(".mhg-libraries-container");
    if (!row) return;

    const frame = requestAnimationFrame(() => {
      centerActiveLibraryInStrip(row, verticalCoverRailScrollLayoutForPath(pathname));
      syncActiveLibraryIconPosition();
    });

    return () => cancelAnimationFrame(frame);
  }, [
    activeSkinWeb.verticalCoverAlignment,
    isNarrow,
    verticalPersistentSidebar,
    pathname,
    activeLibrary?.key,
    activeCollectionShortcutId,
    currentLibraryFilterField,
    isAddGameRoute,
    isSettingsRoute,
    libraries.length,
    collectionShortcuts.length,
    syncActiveLibraryIconPosition,
  ]);

  useEffect(() => {
    if (isNarrow || verticalPersistentSidebar) return;
    const row = containerRef.current?.querySelector<HTMLElement>(".mhg-libraries-container");
    if (!row) return;

    const scheduleClamp = () => {
      requestAnimationFrame(() => {
        syncLibrariesStripScroll(row);
      });
    };

    scheduleClamp();
    row.addEventListener("scroll", scheduleClamp, { passive: true });
    window.addEventListener("resize", scheduleClamp);

    const resizeObserver = new ResizeObserver(scheduleClamp);
    resizeObserver.observe(row);
    for (const child of row.children) {
      if (child instanceof HTMLElement) resizeObserver.observe(child);
    }

    return () => {
      row.removeEventListener("scroll", scheduleClamp);
      window.removeEventListener("resize", scheduleClamp);
      resizeObserver.disconnect();
    };
  }, [
    isNarrow,
    verticalPersistentSidebar,
    libraries.length,
    pathname,
    collectionShortcuts.length,
    gamesSidebarExpanded,
    showCollapsibleGamesSection,
    inlineOwnedGamesInBar,
    showHeaderActionsInLibrariesBar,
    showSidebarSearchPopup,
    librariesBarLayoutReady,
  ]);

  const comboboxContainerLayoutStyle = useMemo((): CSSProperties | undefined => {
    if (!isNarrow) return undefined;
    const hasLeftMenu = !topRightToolDock && !!API_BASE && (showProfile || !!onReloadMetadata);
    const left = hasLeftMenu ? 72 : 24;
    const rightReserve = Math.max(measuredActionsWidth, 48) + 8;
    return {
      position: "absolute",
      left,
      right: "auto",
      transform: "none",
      width: "auto",
      maxWidth: `calc(100% - ${left + rightReserve}px)`,
      justifyContent: "flex-start",
      overflow: "hidden",
    };
  }, [isNarrow, topRightToolDock, showProfile, measuredActionsWidth]);

  const collapsibleSidebarStyle = useMemo((): CSSProperties | undefined => {
    if (!collapsibleActive) return undefined;
    return {
      transition: "left 0.22s ease",
      left: sidebarOpen ? 0 : "calc(-1 * var(--mhg-sidebar-width, 300px))",
      transform: "none",
      pointerEvents: sidebarOpen ? "auto" : "none",
      zIndex: 10005,
    };
  }, [collapsibleActive, sidebarOpen]);

  return (
    <div
      className={[
        "mhg-libraries-bar",
        verticalPageTabsLayout ? "mhg-libraries-bar--vertical-page-tabs" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={collapsibleSidebarStyle}
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
              isLoading={globalLoading || isActivityBusy}
              tooltipText={isActivityBusy ? activityTooltipText : undefined}
              className="mhg-top-right-tool-dock-activity-spinner"
            />
            <div className="mhg-top-right-tool-dock-update">
              <UpdateNotification />
            </div>
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
            {API_BASE && onReloadMetadata && (
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
      {betweenDockAndStrip}
      <div className="mhg-libraries-bar-container" ref={containerRef}>
        {(!verticalPersistentSidebar || libraries.length === 0) && librariesMenuDropdown}

        {libraries.length > 0 && (
          <>
            {!librariesBarLayoutReady && !activeSkinWeb.libraryPagesVerticalList ? (
              <div
                className="mhg-libraries-bar-measure-hold"
                aria-hidden
                aria-busy="true"
                style={{ minHeight: 64, visibility: "hidden" }}
              />
            ) : isNarrow && !verticalPersistentSidebar ? (
              <div
                className="mhg-libraries-combobox-container"
                style={comboboxContainerLayoutStyle}
              >
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
                {verticalPersistentSidebar && librariesMenuDropdown}
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
                      style={libraryActiveViewTransitionStyle(
                        showLibraryActiveHighlight && activeLibrary?.key === s.key,
                      )}
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
                {showProfileInLibrariesBar && <ProfileDropdown triggerVariant="library" />}
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
