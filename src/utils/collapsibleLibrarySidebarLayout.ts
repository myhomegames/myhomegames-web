import type { CSSProperties } from "react";

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

export function applyCollapsibleLibrarySidebarLayout(sidebarOpen: boolean): void {
  const root = document.querySelector(".app-main-container");
  if (!(root instanceof HTMLElement)) return;

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
