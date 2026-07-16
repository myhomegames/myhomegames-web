/**
 * Inline fixed games-list toolbar (persistent shell, not top-right dock):
 * measure chrome height and expose generic CSS variables for any skin that consumes them.
 */

/** Fired after `--mhg-scroll-top-inset` is updated from measured toolbar height. */
export const MHG_LIST_TOOLBAR_CHROME_SYNC_EVENT = "mhg-list-toolbar-chrome-sync";

const PERSISTENT_SHELL_SELECTOR =
  '.app-main-container[data-mhg-persistent-library-shell="true"]';
const STACKED_PAGE_CHROME_MQ = "(max-width: 1023px)";
/** One-line chip: 8+8 padding + ~14px label. */
const LIST_TOOLBAR_SINGLE_LINE_CHIP_HEIGHT_PX = 40;
/** Extra lift when chip labels wrap (narrow stacked chrome). */
const LIST_TOOLBAR_WRAP_NUDGE_NARROW_MIN_PX = 18;
const LIST_TOOLBAR_WRAP_NUDGE_NARROW_EXTRA_PX = 10;
const LIST_TOOLBAR_WRAP_NUDGE_WIDE_PX = 8;

function isToolbarLabelWrapped(el: HTMLElement): boolean {
  const rects = el.getClientRects();
  if (rects.length > 1) return true;

  if (el.scrollHeight <= 0) return false;
  const style = window.getComputedStyle(el);
  const fontSize = parseFloat(style.fontSize) || 14;
  const parsedLineHeight = parseFloat(style.lineHeight);
  const lineHeight =
    style.lineHeight === "normal" || !Number.isFinite(parsedLineHeight)
      ? fontSize * 1.2
      : parsedLineHeight;
  return el.scrollHeight > lineHeight + 2;
}

function listToolbarHasWrappedLabels(toolbar: HTMLElement): boolean {
  const buttons = toolbar.querySelectorAll<HTMLElement>(".games-list-toolbar-button");
  for (const button of buttons) {
    if (
      Math.ceil(button.getBoundingClientRect().height) > LIST_TOOLBAR_SINGLE_LINE_CHIP_HEIGHT_PX
    ) {
      return true;
    }
  }

  return Array.from(toolbar.querySelectorAll<HTMLElement>(".games-list-toolbar-value")).some(
    isToolbarLabelWrapped,
  );
}

function resolvePersistentShell(toolbar: HTMLElement, doc: Document): HTMLElement | null {
  const fromToolbar = toolbar.closest(".app-main-container");
  if (fromToolbar instanceof HTMLElement) return fromToolbar;
  const fromDoc = doc.querySelector(PERSISTENT_SHELL_SELECTOR);
  return fromDoc instanceof HTMLElement ? fromDoc : null;
}

function measureWrapNudgePx(
  toolbar: HTMLElement,
  doc: Document,
  narrow: boolean,
): number {
  const actions = doc.querySelector(".mhg-libraries-actions");
  if (!(actions instanceof HTMLElement)) {
    return narrow ? LIST_TOOLBAR_WRAP_NUDGE_NARROW_MIN_PX : LIST_TOOLBAR_WRAP_NUDGE_WIDE_PX;
  }

  if (narrow) {
    const toolbarTop = toolbar.getBoundingClientRect().top;
    const actionsBottom = actions.getBoundingClientRect().bottom;
    const gap = toolbarTop - actionsBottom;
    const fromGap =
      gap > 0.5 ? Math.ceil(gap) + LIST_TOOLBAR_WRAP_NUDGE_NARROW_EXTRA_PX : 0;
    return Math.max(LIST_TOOLBAR_WRAP_NUDGE_NARROW_MIN_PX, fromGap);
  }

  return LIST_TOOLBAR_WRAP_NUDGE_WIDE_PX;
}

export function isInlineListToolbarChromeActive(
  toolbar: HTMLElement,
  doc: Document = document,
): boolean {
  const shell = resolvePersistentShell(toolbar, doc);
  return shell?.getAttribute("data-mhg-persistent-library-shell") === "true";
}

/**
 * When chip labels wrap, skins may nudge the toolbar via `--mhg-list-toolbar-wrap-nudge`.
 * Without wraps, positioning stays on the skin stylesheet rules.
 */
export function syncListToolbarLayoutState(
  toolbar: HTMLElement,
  doc: Document = document,
): void {
  if (typeof window === "undefined") return;
  if (!isInlineListToolbarChromeActive(toolbar, doc)) return;

  const shell = resolvePersistentShell(toolbar, doc);
  const wrapped = listToolbarHasWrappedLabels(toolbar);
  const narrow = window.matchMedia(STACKED_PAGE_CHROME_MQ).matches;

  if (wrapped) {
    toolbar.setAttribute("data-mhg-list-toolbar-wrapped", "true");
  } else {
    toolbar.removeAttribute("data-mhg-list-toolbar-wrapped");
  }

  toolbar.style.removeProperty("top");

  if (!shell) return;

  if (wrapped) {
    shell.style.setProperty(
      "--mhg-list-toolbar-wrap-nudge",
      `${measureWrapNudgePx(toolbar, doc, narrow)}px`,
    );
  } else {
    shell.style.removeProperty("--mhg-list-toolbar-wrap-nudge");
  }
}

export function clearListToolbarLayoutState(toolbar: HTMLElement): void {
  toolbar.removeAttribute("data-mhg-list-toolbar-wrapped");
  toolbar.style.removeProperty("top");
  const shell = toolbar.closest(".app-main-container");
  if (shell instanceof HTMLElement) {
    shell.style.removeProperty("--mhg-list-toolbar-wrap-nudge");
  }
}

/**
 * Stacked page chrome: fixed filter/sort toolbar can grow when chip labels wrap.
 * Measure toolbar bottom and drive `--mhg-scroll-top-inset` for virtualized lists.
 */
export function syncListToolbarScrollTopInset(
  doc: Document = document,
  toolbarEl?: HTMLElement | null,
): boolean {
  if (typeof window === "undefined") return false;

  const shell = doc.querySelector(PERSISTENT_SHELL_SELECTOR);
  if (!(shell instanceof HTMLElement)) return false;

  if (!window.matchMedia(STACKED_PAGE_CHROME_MQ).matches) {
    shell.style.removeProperty("--mhg-scroll-top-inset");
    return false;
  }

  const toolbar =
    toolbarEl instanceof HTMLElement
      ? toolbarEl
      : doc.querySelector(".games-list-toolbar");
  if (!(toolbar instanceof HTMLElement)) {
    shell.style.removeProperty("--mhg-scroll-top-inset");
    return false;
  }

  if (!isInlineListToolbarChromeActive(toolbar, doc)) {
    shell.style.removeProperty("--mhg-scroll-top-inset");
    return false;
  }

  const rect = toolbar.getBoundingClientRect();
  if (rect.height <= 0) {
    shell.style.removeProperty("--mhg-scroll-top-inset");
    return false;
  }

  shell.style.setProperty("--mhg-scroll-top-inset", `${Math.ceil(rect.bottom)}px`);
  return true;
}

export function clearListToolbarScrollTopInset(doc: Document = document): void {
  const shell = doc.querySelector(PERSISTENT_SHELL_SELECTOR);
  if (shell instanceof HTMLElement) {
    shell.style.removeProperty("--mhg-scroll-top-inset");
  }
}

export function notifyListToolbarChromeSync(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MHG_LIST_TOOLBAR_CHROME_SYNC_EVENT));
}
