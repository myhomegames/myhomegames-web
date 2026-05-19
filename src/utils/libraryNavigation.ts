import type { NavigateFunction } from "react-router-dom";

/** Select a library tab on `/` (used by context-rail back navigation). */
export function navigateToLibraryRoot(navigate: NavigateFunction, libraryKey: string) {
  localStorage.setItem("lastSelectedLibrary", libraryKey);
  navigate("/");
}
