import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { useSkin } from "./SkinContext";
import { useCollapsibleSidebarViewport } from "../hooks/useCollapsibleSidebarViewport";
import {
  applyCollapsibleLibrarySidebarLayout,
  clearCollapsibleLibrarySidebarLayout,
  LIBRARY_SIDEBAR_BACKDROP_STYLE,
} from "../utils/collapsibleLibrarySidebarLayout";

type LibrarySidebarLayoutContextValue = {
  collapsibleActive: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
};

const LibrarySidebarLayoutContext = createContext<LibrarySidebarLayoutContextValue>({
  collapsibleActive: false,
  sidebarOpen: false,
  toggleSidebar: () => {},
  closeSidebar: () => {},
});

export function LibrarySidebarLayoutProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { activeSkinWeb } = useSkin();
  const isNarrow = useCollapsibleSidebarViewport();
  const collapsibleActive =
    activeSkinWeb.collapsibleLibrarySidebar && activeSkinWeb.persistentLibraryShell && isNarrow;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setSidebarOpen((open) => !open), []);

  useEffect(() => {
    if (!collapsibleActive) {
      setSidebarOpen(false);
    }
  }, [collapsibleActive]);

  useLayoutEffect(() => {
    const root = document.querySelector(".app-main-container");
    if (!(root instanceof HTMLElement)) return;

    if (!collapsibleActive) {
      root.removeAttribute("data-mhg-collapsible-library-sidebar");
      root.removeAttribute("data-mhg-library-sidebar-open");
      clearCollapsibleLibrarySidebarLayout();
      return;
    }

    root.setAttribute("data-mhg-collapsible-library-sidebar", "true");
    root.setAttribute("data-mhg-library-sidebar-open", sidebarOpen ? "true" : "false");
    applyCollapsibleLibrarySidebarLayout(sidebarOpen);

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => applyCollapsibleLibrarySidebarLayout(sidebarOpen))
        : null;
    resizeObserver?.observe(root);

    return () => {
      resizeObserver?.disconnect();
    };
  }, [collapsibleActive, sidebarOpen]);

  useEffect(() => {
    return () => {
      const root = document.querySelector(".app-main-container");
      root?.removeAttribute("data-mhg-collapsible-library-sidebar");
      root?.removeAttribute("data-mhg-library-sidebar-open");
      clearCollapsibleLibrarySidebarLayout();
    };
  }, []);

  useEffect(() => {
    if (!collapsibleActive || !sidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeSidebar();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [collapsibleActive, sidebarOpen, closeSidebar]);

  const value = useMemo(
    (): LibrarySidebarLayoutContextValue => ({
      collapsibleActive,
      sidebarOpen,
      toggleSidebar,
      closeSidebar,
    }),
    [collapsibleActive, sidebarOpen, toggleSidebar, closeSidebar],
  );

  return (
    <LibrarySidebarLayoutContext.Provider value={value}>
      {collapsibleActive && sidebarOpen ? (
        <button
          type="button"
          className="mhg-library-sidebar-backdrop"
          aria-label={t("libraries.closeSidebar")}
          onClick={closeSidebar}
          style={LIBRARY_SIDEBAR_BACKDROP_STYLE}
        />
      ) : null}
      {children}
    </LibrarySidebarLayoutContext.Provider>
  );
}

export function useLibrarySidebarLayout(): LibrarySidebarLayoutContextValue {
  return useContext(LibrarySidebarLayoutContext);
}
