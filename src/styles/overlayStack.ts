export const OVERLAY_STACK_STYLE_ID = "mhg-overlay-stack";

/** Above portaled dropdown submenus (up to ~10101 in PS3) and library-bar menus (10008). */
const OVERLAY_STACK_CSS = `
.add-to-collection-modal-overlay {
  z-index: 10110 !important;
}

body:has(.add-to-collection-modal-overlay) > .add-to-collection-dropdown-menu,
body:has(.add-to-collection-modal-overlay) > .additional-executables-dropdown-menu,
body:has(.add-to-collection-modal-overlay) .dropdown-menu-popup {
  visibility: hidden !important;
  pointer-events: none !important;
}
`;

export function ensureOverlayStackStyles(): void {
  let el = document.getElementById(OVERLAY_STACK_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = OVERLAY_STACK_STYLE_ID;
    el.textContent = OVERLAY_STACK_CSS;
  }
  document.head.appendChild(el);
}
