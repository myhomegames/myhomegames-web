/**
 * Warm background URLs into the browser HTTP/image cache so Smart TV
 * Recommended browse preview can swap fanart without a cold fetch/decode.
 */

const warmed = new Set<string>();
const pending = new Set<string>();
let active = 0;
const queue: string[] = [];

const DEFAULT_CONCURRENCY = 2;

function pump(concurrency: number): void {
  while (active < concurrency && queue.length > 0) {
    const url = queue.shift();
    if (!url || warmed.has(url) || pending.has(url)) continue;
    pending.add(url);
    active += 1;
    const img = new Image();
    img.decoding = "async";
    const settle = () => {
      pending.delete(url);
      warmed.add(url);
      active = Math.max(0, active - 1);
      pump(concurrency);
    };
    img.onload = settle;
    img.onerror = settle;
    img.src = url;
  }
}

/** True if this URL was already requested (success or failure). */
export function isBackgroundUrlWarmed(url: string): boolean {
  return Boolean(url) && warmed.has(url);
}

/**
 * Queue background image URLs for low-priority decode/fetch.
 * Duplicates and empty strings are ignored.
 */
export function preloadBackgroundUrls(
  urls: Iterable<string>,
  options?: { concurrency?: number },
): void {
  if (typeof window === "undefined") return;
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
  let added = false;
  for (const raw of urls) {
    const url = String(raw || "").trim();
    if (!url || warmed.has(url) || pending.has(url) || queue.includes(url)) continue;
    queue.push(url);
    added = true;
  }
  if (added) pump(concurrency);
}

export function preloadBackgroundUrl(
  url: string,
  options?: { concurrency?: number },
): void {
  preloadBackgroundUrls([url], options);
}

/** Collect stable background URLs from Recommended-style section rows. */
export function collectGameBackgroundUrls(
  sections: ReadonlyArray<{ games: ReadonlyArray<{ background?: string | null }> }>,
  buildUrl: (background: string) => string,
  options?: { perSection?: number; maxTotal?: number },
): string[] {
  const perSection = options?.perSection ?? 12;
  const maxTotal = options?.maxTotal ?? 40;
  const out: string[] = [];
  const seen = new Set<string>();

  for (const section of sections) {
    let taken = 0;
    for (const game of section.games) {
      if (out.length >= maxTotal) return out;
      if (taken >= perSection) break;
      const raw = game.background?.trim();
      if (!raw) continue;
      const url = buildUrl(raw);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      out.push(url);
      taken += 1;
    }
  }
  return out;
}
