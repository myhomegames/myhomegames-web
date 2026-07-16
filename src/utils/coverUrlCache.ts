import { buildCoverUrl } from "./api";

/** Path-only key for cover cache busting (query stripped). */
export function normalizeCoverCacheKey(coverOrUrl: string): string {
  const trimmed = coverOrUrl.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("data:") || trimmed.startsWith("blob:")) {
    return trimmed;
  }

  const withoutQuery = trimmed.split("?")[0].split("#")[0];
  if (withoutQuery.startsWith("http://") || withoutQuery.startsWith("https://")) {
    try {
      return new URL(withoutQuery).pathname;
    } catch {
      return withoutQuery;
    }
  }

  return withoutQuery;
}

const bustTimestampByCoverKey = new Map<string, number>();

/** Force browsers to refetch a cover path (e.g. after upload on unchanged path). */
export function bumpCoverCache(coverOrPath: string) {
  const key = normalizeCoverCacheKey(coverOrPath);
  if (!key || key.startsWith("data:") || key.startsWith("blob:")) return;
  bustTimestampByCoverKey.set(key, Date.now());
}

function isExternalAbsoluteUrl(coverOrUrl: string, apiBase: string): boolean {
  if (!coverOrUrl.startsWith("http://") && !coverOrUrl.startsWith("https://")) {
    return false;
  }
  try {
    const origin = new URL(apiBase).origin;
    return !coverOrUrl.startsWith(origin);
  } catch {
    return true;
  }
}

export function resolveStableCoverUrl(apiBase: string, coverOrUrl: string): string {
  const source = coverOrUrl.trim();
  if (!source) return "";

  if (source.startsWith("data:") || source.startsWith("blob:")) {
    return source;
  }

  if (isExternalAbsoluteUrl(source, apiBase)) {
    return source;
  }

  const cacheKey = normalizeCoverCacheKey(source);
  if (!cacheKey) return "";

  let bust = bustTimestampByCoverKey.get(cacheKey);
  if (bust === undefined) {
    bust = Date.now();
    bustTimestampByCoverKey.set(cacheKey, bust);
  }

  return buildCoverUrl(apiBase, cacheKey, true, bust);
}

/** Prefer local cover path, then explicit coverUrl, then externalCoverUrl metadata. */
export function pickCoverSource(
  cover?: string | null,
  coverUrl?: string,
  externalCoverUrl?: string | null,
): string {
  const local = (cover ?? "").trim();
  if (local) return local;
  const built = (coverUrl ?? "").trim();
  if (built) return built;
  return (externalCoverUrl ?? "").trim();
}
