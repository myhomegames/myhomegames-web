/**
 * Warm background URLs into the browser HTTP/image cache so Smart TV
 * Recommended browse preview can swap fanart without a cold fetch/decode.
 */

const warmed = new Set<string>();
const pending = new Set<string>();
let active = 0;
const queue: string[] = [];

const DEFAULT_CONCURRENCY = 2;

function settleUrl(url: string, concurrency: number): void {
  pending.delete(url);
  warmed.add(url);
  active = Math.max(0, active - 1);
  pump(concurrency);
}

function pump(concurrency: number): void {
  while (active < concurrency && queue.length > 0) {
    const url = queue.shift();
    if (!url || warmed.has(url) || pending.has(url)) continue;
    pending.add(url);
    active += 1;
    const img = new Image();
    img.decoding = "async";
    const done = () => settleUrl(url, concurrency);
    img.onload = () => {
      const decoded = img.decode?.();
      if (decoded && typeof decoded.then === "function") {
        decoded.then(done, done);
      } else {
        done();
      }
    };
    img.onerror = done;
    img.src = url;
  }
}

/** True if this URL was already requested (success or failure). */
export function isBackgroundUrlWarmed(url: string): boolean {
  return Boolean(url) && warmed.has(url);
}

/**
 * Resolve when `url` is in the image cache (fetch + decode).
 * Safe to call repeatedly; no-ops for empty strings.
 */
export function whenBackgroundUrlReady(url: string): Promise<boolean> {
  const trimmed = String(url || "").trim();
  if (!trimmed) return Promise.resolve(false);
  if (warmed.has(trimmed)) return Promise.resolve(true);

  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    const finish = (ok: boolean) => {
      warmed.add(trimmed);
      pending.delete(trimmed);
      resolve(ok);
    };
    img.onload = () => {
      const decoded = img.decode?.();
      if (decoded && typeof decoded.then === "function") {
        decoded.then(
          () => finish(true),
          () => finish(true),
        );
      } else {
        finish(true);
      }
    };
    img.onerror = () => finish(false);
    pending.add(trimmed);
    img.src = trimmed;
  });
}

/**
 * Queue background image URLs for low-priority decode/fetch.
 * Duplicates and empty strings are ignored.
 * @param options.priority push to the front of the queue (neighbors of focused cover).
 */
export function preloadBackgroundUrls(
  urls: Iterable<string>,
  options?: { concurrency?: number; priority?: boolean },
): void {
  if (typeof window === "undefined") return;
  const concurrency = options?.concurrency ?? DEFAULT_CONCURRENCY;
  const priority = options?.priority === true;
  let added = false;
  for (const raw of urls) {
    const url = String(raw || "").trim();
    if (!url || warmed.has(url) || pending.has(url) || queue.includes(url)) continue;
    if (priority) queue.unshift(url);
    else queue.push(url);
    added = true;
  }
  if (added) pump(concurrency);
}

export function preloadBackgroundUrl(
  url: string,
  options?: { concurrency?: number; priority?: boolean },
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
