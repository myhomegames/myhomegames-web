/**
 * Resolves `--mhg-grid-top-inset` to used CSS pixels for the given element's
 * cascade context (same as VirtualizedGamesList / VirtualizedCollectionsList).
 *
 * `getPropertyValue('--mhg-grid-top-inset')` + `parseFloat` is unreliable when
 * the serialized value is still a `calc()` / `var()` chain on some engines;
 * assigning `height: var(--mhg-grid-top-inset)` to a probe forces layout
 * resolution to a real pixel height.
 */
export function readGridTopInsetPx(containerEl?: HTMLElement | null): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const mount = containerEl ?? document.documentElement;
  if (!mount.isConnected) return 0;

  const doc = mount.ownerDocument ?? document;
  const probe = doc.createElement("div");
  probe.setAttribute("data-mhg-grid-top-inset-probe", "");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText =
    "position:absolute!important;left:-99999px!important;top:0!important;width:1px!important;box-sizing:border-box!important;height:var(--mhg-grid-top-inset,0px)!important;min-height:0!important;max-height:none!important;visibility:hidden!important;pointer-events:none!important;margin:0!important;padding:0!important;border:0!important;overflow:hidden!important";
  mount.appendChild(probe);
  const h = probe.offsetHeight;
  probe.remove();
  return Number.isFinite(h) && h > 0 ? h : 0;
}
