import type { CSSProperties } from "react";

const CHROME_UNDER_DRAWER_DIM_CLASS = "mhg-under-library-drawer";

const MAIN_COLUMN_SELECTOR =
  ".home-page-main-container, .library-item-detail-page-shell, .game-detail-container, .igdb-game-detail-container";
const BACKDROP_LAYER_SELECTOR =
  ".background-manager-overlay, .background-manager-root.background-manager-root--solid";
const SCROLL_ROOT_SELECTOR = "html, body, #root";
const SIDEBAR_SCROLL_CONTAINER_SELECTOR =
  ".mhg-libraries-bar:not(.mhg-libraries-bar--toolbar) .mhg-libraries-bar-container";
const SIDEBAR_LIST_SELECTOR =
  ".mhg-libraries-bar:not(.mhg-libraries-bar--toolbar) .mhg-libraries-container";

function clearInlineStyle(el: HTMLElement, ...props: string[]) {
  for (const prop of props) {
    el.style.removeProperty(prop);
  }
}

function readLibrarySidebarWidthPx(): number {
  const bar = document.querySelector(".mhg-libraries-bar:not(.mhg-libraries-bar--toolbar)");
  if (bar instanceof HTMLElement) {
    const width = bar.getBoundingClientRect().width;
    if (width > 0) return width;
  }

  const fromVar = getComputedStyle(document.documentElement)
    .getPropertyValue("--mhg-sidebar-width")
    .trim();
  const parsed = Number.parseFloat(fromVar);
  return Number.isFinite(parsed) ? parsed : 300;
}

function collectChromeDimTargets(): HTMLElement[] {
  const targets: HTMLElement[] = [];

  document.querySelectorAll(".mhg-libraries-actions").forEach((actions) => {
    if (!(actions instanceof HTMLElement)) return;

    for (const child of actions.children) {
      if (!(child instanceof HTMLElement)) continue;
      if (child.classList.contains("mhg-libraries-actions-icon-cluster")) {
        for (const iconWrap of child.children) {
          if (iconWrap instanceof HTMLElement) targets.push(iconWrap);
        }
        continue;
      }
      if (child.classList.contains("mhg-libraries-actions-right-extra")) {
        for (const extra of child.children) {
          if (extra instanceof HTMLElement) targets.push(extra);
        }
        continue;
      }
      targets.push(child);
    }
  });

  document.querySelectorAll(".games-list-toolbar .games-list-toolbar-item").forEach((el) => {
    if (el instanceof HTMLElement) targets.push(el);
  });
  document.querySelectorAll(".games-list-toolbar > .games-list-toolbar-count").forEach((el) => {
    if (el instanceof HTMLElement) targets.push(el);
  });

  return targets;
}

function clearChromeUnderLibraryDrawerDimming(): void {
  document.querySelectorAll(`.${CHROME_UNDER_DRAWER_DIM_CLASS}`).forEach((el) => {
    el.classList.remove(CHROME_UNDER_DRAWER_DIM_CLASS);
  });
}

let chromeUnderDrawerDimmingObserver: ResizeObserver | null = null;

function disconnectChromeUnderLibraryDrawerDimmingObserver(): void {
  chromeUnderDrawerDimmingObserver?.disconnect();
  chromeUnderDrawerDimmingObserver = null;
}

export function syncChromeUnderLibraryDrawerDimming(sidebarOpen: boolean): void {
  const root = document.querySelector(".app-main-container");
  if (!(root instanceof HTMLElement)) return;

  const persistentShell = root.getAttribute("data-mhg-persistent-library-shell") === "true";
  const collapsible = root.getAttribute("data-mhg-collapsible-library-sidebar") === "true";

  if (!sidebarOpen || !persistentShell || !collapsible) {
    clearChromeUnderLibraryDrawerDimming();
    return;
  }

  const sidebarWidth = readLibrarySidebarWidthPx();
  for (const target of collectChromeDimTargets()) {
    const { left, right } = target.getBoundingClientRect();
    const underDrawer = left < sidebarWidth - 0.5 && right > 0.5;
    target.classList.toggle(CHROME_UNDER_DRAWER_DIM_CLASS, underDrawer);
  }
}

function ensureChromeUnderLibraryDrawerDimmingObserver(sidebarOpen: boolean): void {
  if (!sidebarOpen) {
    disconnectChromeUnderLibraryDrawerDimmingObserver();
    clearChromeUnderLibraryDrawerDimming();
    return;
  }

  syncChromeUnderLibraryDrawerDimming(true);

  if (typeof ResizeObserver === "undefined") return;

  if (!chromeUnderDrawerDimmingObserver) {
    chromeUnderDrawerDimmingObserver = new ResizeObserver(() => {
      syncChromeUnderLibraryDrawerDimming(true);
    });
  } else {
    chromeUnderDrawerDimmingObserver.disconnect();
  }

  document
    .querySelectorAll(".mhg-libraries-actions, .games-list-toolbar, .mhg-libraries-bar")
    .forEach((el) => {
      if (el instanceof HTMLElement) {
        chromeUnderDrawerDimmingObserver?.observe(el);
      }
    });
}

export function applyCollapsibleLibrarySidebarLayout(sidebarOpen: boolean): void {
  const root = document.querySelector(".app-main-container");
  if (!(root instanceof HTMLElement)) return;

  const persistentShell = root.getAttribute("data-mhg-persistent-library-shell") === "true";

  root.style.minWidth = "0";
  root.style.overflowX = sidebarOpen ? "visible" : "hidden";

  document.querySelectorAll(SCROLL_ROOT_SELECTOR).forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.minWidth = "0";
      el.style.overflowX = sidebarOpen ? "visible" : "hidden";
    }
  });

  document.querySelectorAll(MAIN_COLUMN_SELECTOR).forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.marginLeft = "0";
      el.style.width = "100%";
      if (sidebarOpen) {
        el.style.pointerEvents = "none";
      } else {
        el.style.removeProperty("pointer-events");
      }
    }
  });

  document.querySelectorAll(BACKDROP_LAYER_SELECTOR).forEach((el) => {
    if (el instanceof HTMLElement) {
      el.style.left = sidebarOpen ? "" : "0";
    }
  });

  if (persistentShell) {
    // Skin CSS scrolls `.mhg-libraries-container` inside the flex column; do not override with inline styles.
    document.querySelectorAll(SIDEBAR_SCROLL_CONTAINER_SELECTOR).forEach((el) => {
      if (el instanceof HTMLElement) {
        clearInlineStyle(
          el,
          "overflow-y",
          "overflow-x",
          "overscroll-behavior",
          "-webkit-overflow-scrolling",
          "touch-action",
          "min-height",
        );
      }
    });
    document.querySelectorAll(SIDEBAR_LIST_SELECTOR).forEach((el) => {
      if (el instanceof HTMLElement) {
        clearInlineStyle(el, "max-height", "overflow-y", "flex");
      }
    });
    ensureChromeUnderLibraryDrawerDimmingObserver(sidebarOpen);
    return;
  }

  document.querySelectorAll(SIDEBAR_SCROLL_CONTAINER_SELECTOR).forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (sidebarOpen) {
      el.style.overflowY = "auto";
      el.style.overflowX = "hidden";
      el.style.overscrollBehavior = "contain";
      el.style.setProperty("-webkit-overflow-scrolling", "touch");
      el.style.touchAction = "pan-y";
      el.style.minHeight = "0";
    } else {
      clearInlineStyle(
        el,
        "overflow-y",
        "overflow-x",
        "overscroll-behavior",
        "-webkit-overflow-scrolling",
        "touch-action",
        "min-height",
      );
    }
  });

  document.querySelectorAll(SIDEBAR_LIST_SELECTOR).forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (sidebarOpen) {
      el.style.maxHeight = "none";
      el.style.overflowY = "visible";
      el.style.flex = "0 0 auto";
    } else {
      clearInlineStyle(el, "max-height", "overflow-y", "flex");
    }
  });

  ensureChromeUnderLibraryDrawerDimmingObserver(sidebarOpen);
}

export function clearCollapsibleLibrarySidebarLayout(): void {
  const root = document.querySelector(".app-main-container");
  if (root instanceof HTMLElement) {
    clearInlineStyle(root, "min-width", "overflow-x");
  }

  document.querySelectorAll(SCROLL_ROOT_SELECTOR).forEach((el) => {
    if (el instanceof HTMLElement) {
      clearInlineStyle(el, "min-width", "overflow-x");
    }
  });

  document.querySelectorAll(MAIN_COLUMN_SELECTOR).forEach((el) => {
    if (el instanceof HTMLElement) {
      clearInlineStyle(el, "margin-left", "width", "pointer-events");
    }
  });

  document.querySelectorAll(BACKDROP_LAYER_SELECTOR).forEach((el) => {
    if (el instanceof HTMLElement) {
      clearInlineStyle(el, "left");
    }
  });

  document.querySelectorAll(SIDEBAR_SCROLL_CONTAINER_SELECTOR).forEach((el) => {
    if (el instanceof HTMLElement) {
      clearInlineStyle(
        el,
        "overflow-y",
        "overflow-x",
        "overscroll-behavior",
        "-webkit-overflow-scrolling",
        "touch-action",
        "min-height",
      );
    }
  });

  document.querySelectorAll(SIDEBAR_LIST_SELECTOR).forEach((el) => {
    if (el instanceof HTMLElement) {
      clearInlineStyle(el, "max-height", "overflow-y", "flex");
    }
  });

  disconnectChromeUnderLibraryDrawerDimmingObserver();
  clearChromeUnderLibraryDrawerDimming();
}

export const LIBRARY_SIDEBAR_BACKDROP_STYLE: CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  left: "var(--mhg-sidebar-width, 300px)",
  zIndex: 10004,
  margin: 0,
  padding: 0,
  border: 0,
  background: "rgba(0, 0, 0, 0.45)",
  cursor: "pointer",
};
