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
  /**
   * Replace the global search header control with a title filter that narrows the current page’s
   * lists as the user types: games (library, tag games, detail, recommended), collection-like
   * rows (collections, developers, publishers, sub/parent blocks on detail), and tag index pages.
   */
  headerTitleFilter: boolean;
  /** When true, the A–Z side navigator is hidden on library, tag, and collection-like lists. */
  disableAlphabetNavigator: boolean;
  /**
   * Adds a “Search” row in the main libraries sidebar that opens a modal with the global SearchBar
   * (games, collections, developers, publishers). Intended for skins that replace header search (e.g. title filter).
   */
  sidebarSearchPopup: boolean;
  /**
   * Hides the main games library (`library`) from the top sidebar list and renders it as the first
   * row under the games/collections shortcuts block (the section titled “Games” / “Giochi” in some
   * skins), labeled “Owned games”. Intended with `collectionsShortcutList` for GOG-style sidebars.
   */
  ownedGamesFirstInGamesSidebar: boolean;
  /**
   * Renders the collection-like detail page (collections, developers, publishers) in a compact
   * form that hides the hero (cover, title, rating, summary, actions), list section headings,
   * and the parent collection-like strip. Only the top bar controls and the lists of children
   * (sub-collections and games) remain visible. Intended for skins that already expose edit /
   * delete / play actions from the persistent libraries sidebar.
   */
  compactCollectionLikeDetail: boolean;
};

export const DEFAULT_SKIN_WEB_MANIFEST: SkinWebManifest = {
  persistentLibraryShell: false,
  collectionsShortcutList: false,
  libraryPagesVerticalList: false,
  headerTitleFilter: false,
  disableAlphabetNavigator: false,
  sidebarSearchPopup: false,
  ownedGamesFirstInGamesSidebar: false,
  compactCollectionLikeDetail: false,
};

export const SKIN_WEB_KEYS = [
  "persistentLibraryShell",
  "collectionsShortcutList",
  "libraryPagesVerticalList",
  "headerTitleFilter",
  "disableAlphabetNavigator",
  "sidebarSearchPopup",
  "ownedGamesFirstInGamesSidebar",
  "compactCollectionLikeDetail",
] as const satisfies readonly (keyof SkinWebManifest)[];

/** @deprecated renamed to `SKIN_WEB_KEYS`, kept as alias to avoid churning internal imports. */
const WEB_KEYS = SKIN_WEB_KEYS;

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
  /*
   * Skins that ship `headerTitleFilter` without re-uploading `skin.json` after `sidebarSearchPopup`
   * was added still need the sidebar search entry. Opt out explicitly with `"sidebarSearchPopup": false`.
   */
  if (out.headerTitleFilter) {
    if (!("sidebarSearchPopup" in o)) {
      out.sidebarSearchPopup = true;
    } else {
      out.sidebarSearchPopup = o["sidebarSearchPopup"] === true;
    }
  }
  return out;
}
