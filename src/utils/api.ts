/**
 * API utility functions for building URLs and headers
 */

import { getApiBase, getApiToken } from "../config";
import { bulkMetadataReloadRequestHeaders } from "./bulkMetadataReloadContext";

/**
 * Builds an API URL with optional query parameters
 * @param apiBase - The base URL for the API
 * @param path - The API endpoint path
 * @param params - Optional query parameters
 * @returns The complete URL string
 */
export function buildApiUrl(
  apiBase: string,
  path: string,
  params: Record<string, string | number | boolean> = {}
): string {
  const u = new URL(path, apiBase);
  Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, String(v)));
  return u.toString();
}

/** App API URL using the effective base (public tunnel when connected). */
export function buildAppApiUrl(
  path: string,
  params: Record<string, string | number | boolean> = {},
): string {
  return buildApiUrl(getApiBase(), path, params);
}

/**
 * Builds standard API headers with authentication
 * @param additionalHeaders - Optional additional headers to include
 * @returns Headers object with X-Auth-Token when available
 */
export function buildApiHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getApiToken();
  const headers: Record<string, string> = {
    ...additionalHeaders,
  };

  if (token) {
    headers["X-Auth-Token"] = token;
  }

  Object.assign(headers, bulkMetadataReloadRequestHeaders());

  return headers;
}

/**
 * Builds a cover image URL
 * @param apiBase - The base URL for the API
 * @param cover - The cover path from the server (e.g., /covers/gameId) or full IGDB URL
 * @param addTimestamp - If true, append cache-busting query param (uses customTimestamp or Date.now())
 * @param customTimestamp - Optional fixed timestamp for cache busting (e.g. list load time) so all covers in a view share the same t=
 * @returns The complete cover URL string, or empty string if cover is not provided
 */
export function buildCoverUrl(apiBase: string, cover?: string, addTimestamp?: boolean, customTimestamp?: number): string {
  if (!cover) return "";
  // If cover is already a full URL (starts with http:// or https://), return it directly
  if (cover.startsWith('http://') || cover.startsWith('https://')) {
    return cover;
  }
  // Cover is a relative path from server (e.g., /covers/gameId)
  // Check if it already has a timestamp
  const hasTimestamp = cover.includes('?t=') || cover.includes('&t=');

  // If it already has a timestamp, preserve it when building the URL
  if (hasTimestamp) {
    const basePath = cover.split('?')[0];
    const queryString = cover.includes('?') ? cover.substring(cover.indexOf('?')) : '';
    const u = new URL(basePath, apiBase);
    // Parse existing query string and add to URL
    if (queryString) {
      const params = new URLSearchParams(queryString);
      params.forEach((value, key) => {
        u.searchParams.set(key, value);
      });
    }
    return u.toString();
  }

  // No timestamp, build URL normally
  const u = new URL(cover, apiBase);
  // Add timestamp to force browser reload if requested
  if (addTimestamp) {
    u.searchParams.set('t', (customTimestamp ?? Date.now()).toString());
  }
  return u.toString();
}

/**
 * Builds a background image URL
 * @param apiBase - The base URL for the API
 * @param background - The background path from the server (e.g., /backgrounds/gameId or /collection-backgrounds/collectionId) or full IGDB URL
 * @returns The complete background URL string, or empty string if background is not provided
 */
export function buildBackgroundUrl(apiBase: string, background?: string, addTimestamp?: boolean): string {
  if (!background) return "";
  // If background is already a full URL (starts with http:// or https://), return it directly
  if (background.startsWith('http://') || background.startsWith('https://')) {
    return background;
  }
  // Background is a relative path from server (e.g., /backgrounds/gameId)
  // Check if it already has a timestamp
  const hasTimestamp = background.includes('?t=') || background.includes('&t=');
  
  // If it already has a timestamp, preserve it when building the URL
  if (hasTimestamp) {
    const basePath = background.split('?')[0];
    const queryString = background.includes('?') ? background.substring(background.indexOf('?')) : '';
    const u = new URL(basePath, apiBase);
    // Parse existing query string and add to URL
    if (queryString) {
      const params = new URLSearchParams(queryString);
      params.forEach((value, key) => {
        u.searchParams.set(key, value);
      });
    }
    return u.toString();
  }
  
  // No timestamp, build URL normally
  const u = new URL(background, apiBase);
  // Add timestamp to force browser reload if requested
  if (addTimestamp) {
    u.searchParams.set('t', Date.now().toString());
  }
  return u.toString();
}

/**
 * Returns the embed URL to use for iframes. For YouTube, uses the privacy-enhanced
 * youtube-nocookie.com domain to reduce tracking and console noise from Google Ads/CORS.
 * Other URLs are returned unchanged.
 */
export function getEmbedVideoUrl(url: string): string {
  if (!url || !url.trim()) return "";
  try {
    const u = new URL(url.trim());
    const host = u.hostname.toLowerCase();
    if (host === "www.youtube.com" || host === "youtube.com") {
      u.hostname = "www.youtube-nocookie.com";
      return u.toString();
    }
    return url.trim();
  } catch {
    return url.trim();
  }
}
