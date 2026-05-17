import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useLoading } from "../contexts/LoadingContext";
import type { GameLibrarySection, ViewMode } from "../types";
import { API_BASE } from "../config";
import { buildApiHeaders } from "../utils/api";
import { buildLibrarySections, normalizeVisibleLibraries } from "../utils/librarySections";

type Options = {
  syncCoverSizeWithPathname: boolean;
  navigateHomeWhenLibraryChanges: boolean;
};

export function useLibrariesShellState(options: Options) {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoading } = useLoading();

  const [libraries, setLibraries] = useState<GameLibrarySection[]>(() =>
    buildLibrarySections(normalizeVisibleLibraries([]))
  );
  const [activeLibrary, setActiveLibrary] = useState<GameLibrarySection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coverSize, setCoverSize] = useState(() => {
    const saved = localStorage.getItem("coverSize");
    return saved ? parseInt(saved, 10) : 150;
  });
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [mainGamesOnly, setMainGamesOnly] = useState<boolean>(() => {
    return localStorage.getItem("libraryMainGamesOnly") === "true";
  });

  useEffect(() => {
    localStorage.setItem("libraryMainGamesOnly", String(mainGamesOnly));
  }, [mainGamesOnly]);

  useEffect(() => {
    if (!options.syncCoverSizeWithPathname) return;
    const raw = localStorage.getItem("coverSize");
    if (raw) {
      const next = parseInt(raw, 10);
      if (!Number.isNaN(next)) setCoverSize(next);
    }
  }, [location.pathname, options.syncCoverSizeWithPathname]);

  const saveViewModeForLibrary = useCallback((libraryKey: string, mode: ViewMode) => {
    localStorage.setItem(`viewMode_${libraryKey}`, mode);
  }, []);

  const loadViewModeForLibrary = useCallback((libraryKey: string): ViewMode => {
    const saved = localStorage.getItem(`viewMode_${libraryKey}`);
    return (saved as ViewMode) || "grid";
  }, []);

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      if (activeLibrary && activeLibrary.key === "library") {
        saveViewModeForLibrary(activeLibrary.key, mode);
      }
    },
    [activeLibrary, saveViewModeForLibrary]
  );

  const handleCoverSizeChange = useCallback((size: number) => {
    setCoverSize(size);
    localStorage.setItem("coverSize", size.toString());
    /*
     * In the persistent shell LibrariesBar mounts once in MainAppLayout and
     * cover size state lives here; Outlet children (collection/developer/publisher/tag detail
     * pages) still keep their own coverSize state initialized from localStorage. Dispatch an
     * event so they stay in sync when the slider moves in the persistent bar.
     */
    window.dispatchEvent(
      new CustomEvent("mhg-cover-size-changed", { detail: { size } })
    );
  }, []);

  useEffect(() => {
    async function fetchLibraries() {
      setError(null);
      try {
        let visibleLibraries: string[] | null = null;

        if (API_BASE) {
          try {
            const url = new URL("/settings", API_BASE);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000);
            const res = await fetch(url.toString(), {
              headers: buildApiHeaders({ Accept: "application/json" }),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (res.ok) {
              const data = await res.json();
              if (Array.isArray(data.visibleLibraries)) {
                visibleLibraries = data.visibleLibraries;
                localStorage.setItem("visibleLibraries", JSON.stringify(data.visibleLibraries));
              }
            }
          } catch (err) {
            console.warn("Failed to load visible libraries from settings:", err);
          }
        }

        if (!visibleLibraries) {
          const stored = localStorage.getItem("visibleLibraries");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                visibleLibraries = parsed;
              }
            } catch {
              visibleLibraries = null;
            }
          }
        }

        const normalized = normalizeVisibleLibraries(visibleLibraries || []);
        setLibraries(buildLibrarySections(normalized));
      } catch (err: unknown) {
        setError(String(err instanceof Error ? err.message : err));
      }
    }
    void fetchLibraries();
  }, []);

  useEffect(() => {
    if (libraries.length === 0) {
      return;
    }

    const savedLibraryKey = localStorage.getItem("lastSelectedLibrary");
    const currentIsValid = activeLibrary
      ? libraries.some((lib) => lib.key === activeLibrary.key)
      : false;
    const libraryToSelect = currentIsValid
      ? activeLibrary
      : savedLibraryKey
        ? libraries.find((lib) => lib.key === savedLibraryKey) || libraries[0]
        : libraries[0];

    if (!activeLibrary || activeLibrary.key !== libraryToSelect?.key) {
      setActiveLibrary(libraryToSelect);
    }
    if (libraryToSelect?.key) {
      localStorage.setItem("lastSelectedLibrary", libraryToSelect.key);
    }

    if (libraryToSelect?.key === "library") {
      const savedViewMode = loadViewModeForLibrary(libraryToSelect.key);
      setViewMode(savedViewMode);
    } else {
      setViewMode("grid");
    }
  }, [libraries, activeLibrary, loadViewModeForLibrary]);

  const onSelectLibrary = useCallback(
    (s: GameLibrarySection) => {
      localStorage.setItem("lastSelectedLibrary", s.key);
      setActiveLibrary(s);
      if (options.navigateHomeWhenLibraryChanges && location.pathname !== "/") {
        navigate("/");
      }
      if (s.key === "library") {
        const savedViewMode = loadViewModeForLibrary(s.key);
        setViewMode(savedViewMode);
      } else {
        setViewMode("grid");
      }
    },
    [
      location.pathname,
      navigate,
      loadViewModeForLibrary,
      options.navigateHomeWhenLibraryChanges,
    ]
  );

  return {
    libraries,
    activeLibrary,
    error,
    isLoading,
    coverSize,
    handleCoverSizeChange,
    viewMode,
    handleViewModeChange,
    mainGamesOnly,
    setMainGamesOnly,
    onSelectLibrary,
  };
}
