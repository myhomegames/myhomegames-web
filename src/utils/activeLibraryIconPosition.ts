const ACTIVE_ICON_SELECTOR = ".mhg-library-active";

/**
 * Writes `--mhg-active-library-icon-*` on `:root` from the active library tab.
 * Call after horizontal scroll on `.mhg-libraries-container` so vertical cover
 * rails stay aligned with the selected icon.
 */
export function syncActiveLibraryIconPosition(
  barContainerEl: HTMLElement | null | undefined,
): void {
  if (typeof document === "undefined" || !barContainerEl?.isConnected) return;

  const activeButton = barContainerEl.querySelector(ACTIVE_ICON_SELECTOR);
  if (!(activeButton instanceof HTMLElement)) return;

  const rect = activeButton.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const beforeStyle = getComputedStyle(activeButton, "::before");
  const glyphFontSize = parseFloat(beforeStyle.fontSize);
  const glyphHalfWidth =
    Number.isFinite(glyphFontSize) && glyphFontSize > 0 ? glyphFontSize * 0.5 : 26;
  const graphicLeftX = centerX - glyphHalfWidth;

  const root = document.documentElement;
  root.style.setProperty("--mhg-active-library-icon-center-x", `${centerX}px`);
  root.style.setProperty("--mhg-active-library-icon-center-y", `${centerY}px`);
  root.style.setProperty("--mhg-active-library-icon-left-x", `${rect.left}px`);
  root.style.setProperty(
    "--mhg-active-library-icon-graphic-left-x",
    `${graphicLeftX}px`,
  );
}
