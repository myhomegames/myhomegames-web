import type { NavigateFunction } from "react-router-dom";
import {
  navigateBackToContextRailIndex,
  type ContextRailIndexPeekSnapshot,
} from "./contextRailIndexPeek";

/** Select a library tab on `/` (used by context-rail back navigation). */
export function navigateToLibraryRoot(
  navigate: NavigateFunction,
  libraryKey: string,
  options?: { contextRailReturn?: ContextRailIndexPeekSnapshot },
) {
  if (options?.contextRailReturn) {
    navigateBackToContextRailIndex(navigate, libraryKey, options.contextRailReturn);
    return;
  }
  localStorage.setItem("lastSelectedLibrary", libraryKey);
  navigate("/");
}
