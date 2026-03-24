import type { GameItem } from "../types";

/**
 * Returns executables and file names filtered by platform (filename must end with -{platformId}.sh or -{platformId}.bat).
 * Returns null when platformId is missing or no executables match.
 */
export function getExecutablesForPlatform(
  game: GameItem,
  platformId: string
): { executables: string[]; executableFileNames: string[] } | null {
  if (!platformId || typeof platformId !== "string") return null;
  const fileNames = Array.isArray(game.executableFileNames) ? game.executableFileNames : [];
  const execs = Array.isArray(game.executables) ? game.executables : [];
  if (fileNames.length === 0 || execs.length === 0) return null;
  const suffixSh = `-${platformId}.sh`;
  const suffixBat = `-${platformId}.bat`;
  const filteredExecs: string[] = [];
  const filteredNames: string[] = [];
  for (let i = 0; i < Math.min(execs.length, fileNames.length); i++) {
    const fn = fileNames[i];
    if (typeof fn === "string" && (fn.endsWith(suffixSh) || fn.endsWith(suffixBat))) {
      filteredExecs.push(execs[i]);
      filteredNames.push(fn);
    }
  }
  if (filteredExecs.length === 0) return null;
  return { executables: filteredExecs, executableFileNames: filteredNames };
}

export function gameHasExecutableForPlatform(game: GameItem, platformId: string): boolean {
  return getExecutablesForPlatform(game, platformId) !== null;
}

/**
 * Returns executables and file names with entries for the given platform REMOVED.
 * Used when "unlink for this platform" so we send to the API only the remaining executables.
 */
export function getExecutablesExcludingPlatform(
  game: GameItem,
  platformId: string
): { executables: string[]; executableFileNames: string[] } {
  if (!platformId || typeof platformId !== "string") {
    const execs = Array.isArray(game.executables) ? game.executables.filter((e): e is string => e != null) : [];
    const names = Array.isArray(game.executableFileNames) ? game.executableFileNames.filter((n): n is string => n != null) : [];
    return { executables: execs, executableFileNames: names };
  }
  const fileNames = Array.isArray(game.executableFileNames) ? game.executableFileNames : [];
  const execs = Array.isArray(game.executables) ? game.executables : [];
  const suffixSh = `-${platformId}.sh`;
  const suffixBat = `-${platformId}.bat`;
  const filteredExecs: string[] = [];
  const filteredNames: string[] = [];
  for (let i = 0; i < Math.min(execs.length, fileNames.length); i++) {
    const fn = fileNames[i];
    if (typeof fn !== "string" || (!fn.endsWith(suffixSh) && !fn.endsWith(suffixBat))) {
      if (execs[i] != null) filteredExecs.push(execs[i]);
      if (fn != null) filteredNames.push(fn);
    }
  }
  return { executables: filteredExecs, executableFileNames: filteredNames };
}

/**
 * Extract platform id from executable filename (same logic as server platformIdFromBasename).
 * Returns the suffix after the last hyphen before extension, if numeric; else "".
 */
export function getPlatformIdFromExecutableFilename(filename: string): string {
  if (!filename || typeof filename !== "string") return "";
  const base = filename.replace(/\.[^.]+$/, ""); // strip extension
  const dashLast = base.lastIndexOf("-");
  if (dashLast <= 0) return "";
  const suffix = base.slice(dashLast + 1);
  return /^\d+$/.test(suffix) ? suffix : "";
}
