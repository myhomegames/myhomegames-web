/**
 * Optional flags from each skin's skin.json → `web` object.
 * The web app never branches on skin name or id — only on these booleans.
 */
export type SkinWebManifest = {
  /** Header + libraries bar stay mounted; main content swaps via nested routes (`MainAppLayout`). */
  persistentLibraryShell: boolean;
  /** Show per-collection shortcut buttons in the libraries bar. */
  collectionsShortcutList: boolean;
  /** Always show library page tabs as a vertical list (never the narrow combobox). */
  libraryPagesVerticalList: boolean;
};

export const DEFAULT_SKIN_WEB_MANIFEST: SkinWebManifest = {
  persistentLibraryShell: false,
  collectionsShortcutList: false,
  libraryPagesVerticalList: false,
};

const WEB_KEYS = [
  "persistentLibraryShell",
  "collectionsShortcutList",
  "libraryPagesVerticalList",
] as const satisfies readonly (keyof SkinWebManifest)[];

/** Normalize API/JSON `web` payload to a safe manifest (unknown keys ignored). */
export function normalizeSkinWebManifest(raw: unknown): SkinWebManifest {
  const out = { ...DEFAULT_SKIN_WEB_MANIFEST };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return out;
  }
  const o = raw as Record<string, unknown>;
  for (const key of WEB_KEYS) {
    if (o[key] === true) {
      out[key] = true;
    }
  }
  return out;
}
