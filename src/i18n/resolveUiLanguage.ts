/** UI languages shipped in `src/i18n/locales/` (keep in sync with server `supportedLanguages.js`). */
export const SUPPORTED_UI_LANGUAGES = [
  "en",
  "it",
  "pt",
  "es",
  "fr",
  "de",
  "zh",
  "ja",
] as const;

export type SupportedUiLanguage = (typeof SUPPORTED_UI_LANGUAGES)[number];

export function isSupportedUiLanguage(value: string): value is SupportedUiLanguage {
  return (SUPPORTED_UI_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Map a BCP-47 tag (e.g. `it-IT`, `zh-CN`) to a supported UI language.
 * Returns null when there is no MyHomeGames match (caller can fall back to `en`).
 */
export function matchSupportedUiLanguage(
  lang: string | null | undefined,
): SupportedUiLanguage | null {
  const raw = String(lang || "").trim().toLowerCase();
  if (!raw) return null;
  if (raw.startsWith("zh")) return "zh";
  const primary = raw.split(/[-_]/)[0] || "";
  if (isSupportedUiLanguage(primary)) return primary;
  return null;
}

/** Like matchSupportedUiLanguage, but unknown tags become `en`. */
export function normalizeUiLanguage(lang: string | null | undefined): SupportedUiLanguage {
  return matchSupportedUiLanguage(lang) ?? "en";
}

/**
 * Prefer the browser's language list; first supported tag wins; otherwise English.
 */
export function resolveUiLanguageFromBrowser(
  languages: readonly string[] | undefined = typeof navigator !== "undefined"
    ? navigator.languages?.length
      ? [...navigator.languages]
      : navigator.language
        ? [navigator.language]
        : []
    : [],
): SupportedUiLanguage {
  for (const tag of languages) {
    const matched = matchSupportedUiLanguage(tag);
    if (matched) return matched;
  }
  return "en";
}

/**
 * Saved UI language if present and supported; otherwise browser language (or `en`).
 */
export function resolveInitialUiLanguage(
  stored: string | null | undefined =
    typeof localStorage !== "undefined" ? localStorage.getItem("language") : null,
  browserLanguages?: readonly string[],
): SupportedUiLanguage {
  const fromStored = matchSupportedUiLanguage(stored);
  if (fromStored) return fromStored;
  return resolveUiLanguageFromBrowser(browserLanguages);
}
