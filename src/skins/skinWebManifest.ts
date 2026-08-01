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
  /** Navigate between library sections on hover (without clicking). */
  libraryHoverSelect: boolean;
  /** Render header settings/profile actions inside LibrariesBar right actions. */
  libraryBarHeaderActions: boolean;
  /**
   * Extra row above the libraries strip (full width, tools aligned right): logo, view mode, cover
   * size, overflow menu. The icon strip moves down; controls are not duplicated in the strip.
   */
  topRightToolDock: boolean;
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
   * skins), labeled “Owned games”. Intended with `collectionsShortcutList` for persistent sidebars.
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
  /** Render games/tag/collection-like covers as a vertically aligned column. */
  verticalCoverAlignment: boolean;
  /** Play a short tick when navigating lists or the library bar (XMB-style). */
  fixedFocalStepSound: boolean;
  /**
   * When a game or collection-like is focal-selected in a vertical rail (wheel / step
   * navigation — no click required), show its background automatically (XMB-style).
   */
  autoShowBackgroundOnSelection: boolean;
  /**
   * Game/catalog detail: enable the detail backdrop layout hook
   * (`data-mhg-background-layout="detail"` + narrow hero collapse on scroll).
   * Skin CSS decides the look (e.g. cropped hero on TV/phone); without matching
   * CSS the portal stays full-bleed.
   */
  detailBackdropLayout: boolean;
  /**
   * On Smart TV and narrow/phone viewports, InlineTagList items are not clickable
   * (no navigation) and the “and more” collapse is disabled so all tags show.
   */
  staticInlineTagListOnTvPhone: boolean;
  /**
   * On Smart TV, activating a game/catalog detail Summary opens a full-screen
   * overlay (full-height cover + full text + GameInfoBlock) instead of expanding
   * the truncated text in place.
   */
  tvSummaryOverlay: boolean;
  /**
   * On Smart TV, the detail star rating is a single focus target; OK opens a
   * full-screen overlay (title + interactive stars + Done) instead of editing
   * stars in place on the detail page.
   */
  tvStarRatingOverlay: boolean;
  /**
   * On Smart TV game/catalog/collection-like detail, render Summary above the
   * Play/actions row (and navigate the TV focus ladder in that order).
   */
  tvDetailSummaryBeforeActions: boolean;
  /**
   * On Smart TV Recommended (horizontal strips), show a top browse panel with
   * the focused game’s detail through Summary; auto-select the first cover and
   * update as the remote moves between covers.
   */
  tvRecommendedBrowsePreview: boolean;
  /**
   * On phone game/catalog detail, show a Back control beside the background
   * toggle in the libraries bar actions (or alone if the toggle is moved).
   */
  phoneDetailBackBesideBackground: boolean;
  /** Do not show hover tooltips anywhere in the UI. */
  disableTitleTooltips: boolean;
  /**
   * On narrow viewports, hide the persistent libraries sidebar off-screen; user opens it
   * via a header toggle (main column uses full width while collapsed).
   */
  collapsibleLibrarySidebar: boolean;
};

export const DEFAULT_SKIN_WEB_MANIFEST: SkinWebManifest = {
  persistentLibraryShell: false,
  collectionsShortcutList: false,
  libraryPagesVerticalList: false,
  libraryHoverSelect: false,
  libraryBarHeaderActions: false,
  topRightToolDock: false,
  headerTitleFilter: false,
  disableAlphabetNavigator: false,
  sidebarSearchPopup: false,
  ownedGamesFirstInGamesSidebar: false,
  compactCollectionLikeDetail: false,
  verticalCoverAlignment: false,
  fixedFocalStepSound: false,
  autoShowBackgroundOnSelection: false,
  detailBackdropLayout: false,
  staticInlineTagListOnTvPhone: false,
  tvSummaryOverlay: false,
  tvStarRatingOverlay: false,
  tvDetailSummaryBeforeActions: false,
  tvRecommendedBrowsePreview: false,
  phoneDetailBackBesideBackground: false,
  disableTitleTooltips: false,
  collapsibleLibrarySidebar: false,
};

export const SKIN_WEB_KEYS = [
  "persistentLibraryShell",
  "collectionsShortcutList",
  "libraryPagesVerticalList",
  "libraryHoverSelect",
  "libraryBarHeaderActions",
  "topRightToolDock",
  "headerTitleFilter",
  "disableAlphabetNavigator",
  "sidebarSearchPopup",
  "ownedGamesFirstInGamesSidebar",
  "compactCollectionLikeDetail",
  "verticalCoverAlignment",
  "fixedFocalStepSound",
  "autoShowBackgroundOnSelection",
  "detailBackdropLayout",
  "staticInlineTagListOnTvPhone",
  "tvSummaryOverlay",
  "tvStarRatingOverlay",
  "tvDetailSummaryBeforeActions",
  "tvRecommendedBrowsePreview",
  "phoneDetailBackBesideBackground",
  "disableTitleTooltips",
  "collapsibleLibrarySidebar",
] as const satisfies readonly (keyof SkinWebManifest)[];

/**
 * Skin-manifest layout chrome — applied from skin.json / hydrate, not shown as
 * Settings checkboxes (authors set these; users should not toggle them ad hoc).
 */
export const SKIN_WEB_SETTINGS_HIDDEN_KEYS = new Set<keyof SkinWebManifest>([
  "phoneDetailBackBesideBackground",
]);

/** Keys listed as checkboxes under Settings → Skin options. */
export const SKIN_WEB_SETTINGS_OPTION_KEYS = SKIN_WEB_KEYS.filter(
  (key) => !SKIN_WEB_SETTINGS_HIDDEN_KEYS.has(key),
);

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
