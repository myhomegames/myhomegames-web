import { useEffect } from "react";

/**
 * Continuously updates a `--mhg-cell-scale` CSS variable on every visible
 * virtualized cover pad so skins can render covers smaller when they sit
 * "behind" the libraries bar (an overlay band at the top of the page in some
 * skins) and at full size when they sit below it. Skins opt in with
 *
 *   .virtualized-grid-cell-pad { transform: scale(var(--mhg-cell-scale, 1)); }
 *
 * Skins where the libraries bar is in normal flow (not an overlay) get no
 * effect because every cell's `top` ends up below the bar's bottom — they
 * stay at the default scale of 1.
 *
 * The progress is computed per-pad from `getBoundingClientRect()` against the
 * bar's `getBoundingClientRect().bottom`, so it works with `react-window`'s
 * transform-based cell positioning (CSS `view()` timelines do not, because
 * they read the layout box which is the same for every cell).
 *
 * Updates are rAF-throttled and triggered by ANY scroll event in the document
 * (capture-phase) so cells in horizontally-scrolling carousels still react to
 * the outer page scroll, plus by resize and an initial schedule for mount.
 *
 * Tag index cards (`.tag-list-item`) can opt into a later shrink start via
 * `--mhg-tag-scale-bar-lift-px` on `:root` (see `updateGlobalScales`).
 *
 * Skins that set `--mhg-cover-scale-selected-only: 1` on `:root` switch to a
 * discrete model: only the pad whose top is nearest the focal align line gets
 * `--mhg-cell-scale-selected`; all others get `--mhg-cell-scale-unselected`.
 * Context-rail columns use the fixed cover on the left as the focal line.
 */

/** Scale floor: covers fully above the bar are rendered at this size. */
const SCALE_MIN = 0.5;
/** Scale ceiling: covers fully below the bar are rendered at this size. */
const SCALE_MAX = 1;

function readSelectedOnlyMode(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--mhg-cover-scale-selected-only")
    .trim()
    .toLowerCase();
  return raw === "1" || raw === "true";
}

function readScaleUnselected(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return SCALE_MIN;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--mhg-cell-scale-unselected")
    .trim();
  const v = parseFloat(raw);
  return Number.isFinite(v) && v > 0 ? v : SCALE_MIN;
}

function readScaleSelected(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return SCALE_MAX;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--mhg-cell-scale-selected")
    .trim();
  const v = parseFloat(raw);
  return Number.isFinite(v) && v > 0 ? v : SCALE_MAX;
}

function findContextRailFocalLineY(): number | null {
  const cover = document.querySelector<HTMLElement>(
    ".library-item-detail-context-rail-cover, .tag-games-context-rail-cover",
  );
  if (!cover) return null;
  const rect = cover.getBoundingClientRect();
  if (rect.height <= 0) return null;
  return rect.top;
}

function findLibraryFocalLineY(): number | null {
  const barBottom = findBarBottom();
  if (barBottom == null) return null;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--mhg-cover-scale-focal-below-bar")
    .trim();
  const extra = parseFloat(raw);
  const gap = Number.isFinite(extra) ? extra : 2;
  return barBottom + gap;
}

function findFocalLineY(scroller: HTMLElement): number | null {
  if (scroller.closest(".library-item-detail-context-games, .tag-games-context-games")) {
    return findContextRailFocalLineY();
  }
  return findLibraryFocalLineY();
}

function applySelectedOnlyScale(pads: Iterable<HTMLElement>, focalY: number): void {
  const unselected = readScaleUnselected();
  const selected = readScaleSelected();
  let bestPad: HTMLElement | null = null;
  let bestDist = Number.POSITIVE_INFINITY;

  for (const pad of pads) {
    const rect = pad.getBoundingClientRect();
    if (rect.height <= 0) continue;
    const dist = Math.abs(rect.top - focalY);
    if (dist < bestDist) {
      bestDist = dist;
      bestPad = pad;
    }
  }

  for (const pad of pads) {
    const isSelected = pad === bestPad && bestPad != null;
    pad.style.setProperty("--mhg-cell-scale", (isSelected ? selected : unselected).toFixed(3));
    pad.classList.toggle("mhg-cover-scale-selected", isSelected);
  }
}

/** Selector for the libraries bar element in any skin that exposes it. */
const BAR_SELECTOR = ".mhg-libraries-bar";

/** Inner pad div rendered by each virtualized cell renderer. */
const PAD_SELECTOR = ".virtualized-grid-cell-pad";

/**
 * Selector for the react-window scroller. The Grid in `VirtualizedGamesList`
 * and `VirtualizedCollectionsList` is rendered with these classes; both are
 * the `overflow: auto` scrollers that own the virtualized cells.
 */
const SCROLLER_SELECTOR = ".virtualized-games-grid, .virtualized-collections-grid";

type UseCoverScaleAroundBarOptions = {
  /** Ref to the react-window Grid handle (`grid.element` is the scroller). */
  gridRef: React.RefObject<{ element?: HTMLElement | null } | null>;
  /** Ref to the wrapper around the Grid (fallback for finding the scroller). */
  containerRef: React.RefObject<HTMLElement | null>;
};

function findScroller(
  gridRef: UseCoverScaleAroundBarOptions["gridRef"],
  containerRef: UseCoverScaleAroundBarOptions["containerRef"]
): HTMLElement | null {
  // Fast path: react-window 2.x's imperative handle exposes `.element` in
  // some builds. When available it is unambiguously the scrollable wrapper.
  const grid = gridRef.current;
  if (grid && grid.element instanceof HTMLElement) return grid.element;
  // Fallback: the containerRef may be the immediate wrapper around the Grid
  // (`.games-list-container--virtualized`) or a page-level scroll container
  // (`.home-page-scroll-container`). The Grid scroller has a stable class.
  const container = containerRef.current;
  if (container) {
    if (container.matches(SCROLLER_SELECTOR)) return container;
    const scroller = container.querySelector<HTMLElement>(SCROLLER_SELECTOR);
    if (scroller) return scroller;
  }
  return null;
}

/**
 * The bar's overlay bottom edge in viewport coordinates, or `null` when no
 * overlay-style bar is present (which switches the effect off — every cell
 * is left at the default scale of 1 in CSS).
 */
function findBarBottom(): number | null {
  const bar = document.querySelector<HTMLElement>(BAR_SELECTOR);
  if (!bar) return null;
  const rect = bar.getBoundingClientRect();
  if (rect.bottom <= 0 || rect.height === 0) return null;
  return rect.bottom;
}

/** Pixels to shift the bar reference line up for tag index tiles only (later shrink). */
function readTagScaleBarLiftPx(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--mhg-tag-scale-bar-lift-px")
    .trim();
  const v = parseFloat(raw);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.min(v, 240);
}

function updateScales(
  gridRef: UseCoverScaleAroundBarOptions["gridRef"],
  containerRef: UseCoverScaleAroundBarOptions["containerRef"]
): void {
  const scroller = findScroller(gridRef, containerRef);
  if (!scroller) return;
  const pads = scroller.querySelectorAll<HTMLElement>(PAD_SELECTOR);
  if (pads.length === 0) return;

  if (readSelectedOnlyMode()) {
    const focalY = findFocalLineY(scroller);
    if (focalY == null) {
      pads.forEach((pad) => {
        pad.style.removeProperty("--mhg-cell-scale");
        pad.classList.remove("mhg-cover-scale-selected");
      });
      return;
    }
    applySelectedOnlyScale(pads, focalY);
    return;
  }

  const barBottom = findBarBottom();
  if (barBottom == null) {
    pads.forEach((pad) => {
      pad.style.removeProperty("--mhg-cell-scale");
      pad.classList.remove("mhg-cover-scale-selected");
    });
    return;
  }

  pads.forEach((pad) => {
    pad.classList.remove("mhg-cover-scale-selected");
    const rect = pad.getBoundingClientRect();
    if (rect.height === 0) return;

    let scale: number;
    if (rect.top >= barBottom) {
      scale = SCALE_MAX;
    } else if (rect.bottom <= barBottom) {
      scale = SCALE_MIN;
    } else {
      // Pad straddles the bar: interpolate by how much of the pad is hidden
      // above the bar's bottom edge.
      const above = barBottom - rect.top;
      const ratio = Math.min(1, Math.max(0, above / rect.height));
      scale = SCALE_MAX - (SCALE_MAX - SCALE_MIN) * ratio;
    }

    pad.style.setProperty("--mhg-cell-scale", scale.toFixed(3));
  });
}

/**
 * Selectors for non-virtualized cover items that should also participate in
 * the depth scaling effect (tag list, non-virtualized collection rail, the
 * library item detail subcollections grid). These live in normal document
 * flow inside the page-level scroll container, so we scan for them globally
 * rather than under a single scroller.
 */
const GLOBAL_PAD_SELECTORS = [
  ".tag-list-item",
  ".collections-list-item--sized",
  ".library-item-detail-subcollection-cell",
  ".games-list-item--cover-sized",
].join(", ");

/** Page-level scroll roots for non-virtualized cover lists. */
const GLOBAL_SCROLL_ROOT_SELECTOR = [
  ".home-page-scroll-container",
  ".recommended-page-scroll",
  ".scrollable-section-scroll",
  ".library-item-detail-scroll",
  ".library-item-detail-context-games",
  ".tag-games-context-games",
].join(", ");

function findGlobalScrollRoot(pad: HTMLElement): HTMLElement | null {
  return pad.closest<HTMLElement>(GLOBAL_SCROLL_ROOT_SELECTOR);
}

function findFocalLineYForRoot(root: HTMLElement | null): number | null {
  if (root?.closest(".library-item-detail-context-games, .tag-games-context-games")) {
    return findContextRailFocalLineY();
  }
  return findLibraryFocalLineY();
}

function isLibraryVerticalGamesCoverEl(el: HTMLElement): boolean {
  return Boolean(el.closest(".mhg-library-vertical-covers .fixed-focal-games-list"));
}

function isFixedFocalTagCoverEl(el: HTMLElement): boolean {
  return Boolean(el.closest(".fixed-focal-tag-list"));
}

function isFixedFocalCollectionsCoverEl(el: HTMLElement): boolean {
  return Boolean(el.closest(".fixed-focal-collections-list"));
}

function updateGlobalScales(): void {
  const pads = document.querySelectorAll<HTMLElement>(GLOBAL_PAD_SELECTORS);
  if (pads.length === 0) return;

  if (readSelectedOnlyMode()) {
    const byRoot = new Map<HTMLElement | null, HTMLElement[]>();
    pads.forEach((pad) => {
      if (isLibraryVerticalGamesCoverEl(pad) || isFixedFocalTagCoverEl(pad) || isFixedFocalCollectionsCoverEl(pad)) return;
      const root = findGlobalScrollRoot(pad);
      const group = byRoot.get(root);
      if (group) group.push(pad);
      else byRoot.set(root, [pad]);
    });

    byRoot.forEach((group, root) => {
      const focalY = findFocalLineYForRoot(root);
      if (focalY == null) {
        group.forEach((pad) => {
          pad.style.removeProperty("--mhg-cell-scale");
          pad.classList.remove("mhg-cover-scale-selected");
        });
        return;
      }
      applySelectedOnlyScale(group, focalY);
    });
    return;
  }

  const barBottom = findBarBottom();
  if (barBottom == null) {
    pads.forEach((pad) => {
      pad.style.removeProperty("--mhg-cell-scale");
      pad.classList.remove("mhg-cover-scale-selected");
    });
    return;
  }

  const tagLift = readTagScaleBarLiftPx();

  pads.forEach((pad) => {
    if (isLibraryVerticalGamesCoverEl(pad) || isFixedFocalTagCoverEl(pad) || isFixedFocalCollectionsCoverEl(pad)) return;
    pad.classList.remove("mhg-cover-scale-selected");
    const rect = pad.getBoundingClientRect();
    if (rect.height === 0) return;

    const edge =
      tagLift > 0 && pad.classList.contains("tag-list-item") ? barBottom - tagLift : barBottom;

    let scale: number;
    if (rect.top >= edge) {
      scale = SCALE_MAX;
    } else if (rect.bottom <= edge) {
      scale = SCALE_MIN;
    } else {
      const above = edge - rect.top;
      const ratio = Math.min(1, Math.max(0, above / rect.height));
      scale = SCALE_MAX - (SCALE_MAX - SCALE_MIN) * ratio;
    }

    pad.style.setProperty("--mhg-cell-scale", scale.toFixed(3));
  });
}

/**
 * App-level companion to `useCoverScaleAroundBar` that handles non-virtualized
 * cover items (tag/collection cards rendered directly in the page flow). Call
 * once at the top of the layout — it's a no-op on skins where the libraries
 * bar is not an overlay (the helper returns early when no overlay bar exists).
 */
/** Run cover-scale updates immediately (PS3 selected-only mode uses this after step snap). */
export function flushGlobalCoverScales(): void {
  updateGlobalScales();
}

export function flushCoverScaleAroundBar(
  gridRef: UseCoverScaleAroundBarOptions["gridRef"],
  containerRef: UseCoverScaleAroundBarOptions["containerRef"],
): void {
  updateScales(gridRef, containerRef);
  updateGlobalScales();
}

export function useGlobalCoverScaleAroundBar(): void {
  useEffect(() => {
    let rafId: number | null = null;
    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      if (readSelectedOnlyMode()) {
        updateGlobalScales();
        return;
      }
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateGlobalScales();
      });
    };

    // Initial pass plus a couple of follow-up frames so cards that mount
    // slightly later (e.g. while data is loading) still get their scale.
    schedule();
    const setupTimers: number[] = [
      window.setTimeout(schedule, 60),
      window.setTimeout(schedule, 240),
    ];

    // Capture-phase scroll listener so the hook reacts to BOTH the page-level
    // scroll container and any nested scrollers.
    const captureOptions: AddEventListenerOptions = { passive: true, capture: true };
    document.addEventListener("scroll", schedule, captureOptions);
    window.addEventListener("resize", schedule);

    // Non-virtualized lists change less often than react-window's, but a
    // body-scoped MutationObserver still catches the initial render and
    // route transitions cheaply (we just rAF-throttle the response).
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      setupTimers.forEach((t) => window.clearTimeout(t));
      document.removeEventListener("scroll", schedule, captureOptions);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);
}

export function useCoverScaleAroundBar({
  gridRef,
  containerRef,
}: UseCoverScaleAroundBarOptions): void {
  useEffect(() => {
    let rafId: number | null = null;
    let cancelled = false;

    const schedule = () => {
      if (cancelled) return;
      if (readSelectedOnlyMode()) {
        updateScales(gridRef, containerRef);
        return;
      }
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        updateScales(gridRef, containerRef);
      });
    };

    // The grid scroller is mounted asynchronously by react-window; wait for it
    // before attaching any listeners, then ping a couple of times after mount
    // to catch cells appearing in the very first frames.
    const setupTimers: number[] = [];
    let removeListeners: (() => void) | null = null;

    const tryAttach = (attempt: number): void => {
      if (cancelled) return;
      const scroller = findScroller(gridRef, containerRef);
      if (!scroller) {
        if (attempt < 30) {
          setupTimers.push(window.setTimeout(() => tryAttach(attempt + 1), 50));
        }
        return;
      }

      schedule();
      // A handful of follow-up frames so cells that mount slightly after the
      // scroller still get their scale set before any user interaction.
      setupTimers.push(window.setTimeout(schedule, 60));
      setupTimers.push(window.setTimeout(schedule, 240));

      // Capture-phase scroll listener on the document so the hook reacts to
      // BOTH the grid's own scroll and any ancestor scroll (e.g. a page that
      // scrolls vertically around a horizontally-scrolling carousel).
      const captureOptions: AddEventListenerOptions = { passive: true, capture: true };
      document.addEventListener("scroll", schedule, captureOptions);
      window.addEventListener("resize", schedule);

      // react-window adds/removes row divs as the user scrolls and as the
      // visible window changes. A MutationObserver catches new cells appearing
      // without an accompanying scroll event (e.g. after the initial mount or
      // when content changes) so their scale is set on the next frame.
      const observer = new MutationObserver(schedule);
      observer.observe(scroller, { childList: true, subtree: true });

      removeListeners = () => {
        document.removeEventListener("scroll", schedule, captureOptions);
        window.removeEventListener("resize", schedule);
        observer.disconnect();
      };
    };

    tryAttach(0);

    return () => {
      cancelled = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      setupTimers.forEach((t) => window.clearTimeout(t));
      if (removeListeners) removeListeners();
    };
  }, [gridRef, containerRef]);
}
