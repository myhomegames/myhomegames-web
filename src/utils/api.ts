/**
 * API utility functions for building URLs
 */

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

