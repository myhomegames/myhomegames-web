/**
 * API utility functions for building URLs and headers
 */

import { getApiToken, getTwitchClientId } from "../config";

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

/**
 * Builds standard API headers with authentication
 * @param additionalHeaders - Optional additional headers to include
 * @returns Headers object with X-Auth-Token and optionally X-Twitch-Client-Id
 */
export function buildApiHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getApiToken();
  const headers: Record<string, string> = {
    ...additionalHeaders,
  };
  
  if (token) {
    headers["X-Auth-Token"] = token;
    
    // Add Twitch Client ID if available and token is not a dev token
    // Dev tokens are those from VITE_API_TOKEN env var
    const devToken = import.meta.env.VITE_API_TOKEN;
    const isDevToken = devToken && token === devToken;
    const clientId = getTwitchClientId();
    
    if (clientId && !isDevToken) {
      headers["X-Twitch-Client-Id"] = clientId;
    }
  }
  
  return headers;
}

/**
 * Builds a cover image URL
 * @param apiBase - The base URL for the API
 * @param cover - The cover path from the server (e.g., /covers/gameId) or full IGDB URL
 * @returns The complete cover URL string, or empty string if cover is not provided
 */
export function buildCoverUrl(apiBase: string, cover?: string, addTimestamp?: boolean): string {
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
    u.searchParams.set('t', Date.now().toString());
  }
  return u.toString();
}

/**
 * Builds a category cover image URL (managed entirely on client side)
 * @param apiBase - The base URL for the API
 * @param categoryId - The category ID
 * @param cover - Optional local cover path from the server (should be /category-covers/:title if local cover exists)
 * @param addTimestamp - Whether to add a timestamp query parameter
 * @returns The complete category cover URL string
 */
export function buildCategoryCoverUrl(apiBase: string, categoryId: string | number, cover?: string, addTimestamp?: boolean): string {
  let coverPath: string;
  
  if (cover && cover.trim() !== "") {
    // If cover is already a full URL (starts with http:// or https://), return it directly
    if (cover.startsWith('http://') || cover.startsWith('https://')) {
      return cover;
    }
    // Use the local cover path (/category-covers/...) or remote path (/categories/$ID/cover.webp)
    coverPath = cover;
  } else {
    // If no cover provided, use remote cover URL: /categories/$ID/cover.webp
    coverPath = `/categories/${categoryId}/cover.webp`;
  }
  
  // Check if it already has a timestamp (align with buildCoverUrl logic)
  const hasTimestamp = coverPath.includes('?t=') || coverPath.includes('&t=');
  
  // If it already has a timestamp, preserve it when building the URL
  if (hasTimestamp) {
    const basePath = coverPath.split('?')[0];
    const queryString = coverPath.includes('?') ? coverPath.substring(coverPath.indexOf('?')) : '';
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
  const u = new URL(coverPath, apiBase);
  // Add timestamp to force browser reload if requested
  if (addTimestamp) {
    u.searchParams.set('t', Date.now().toString());
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
