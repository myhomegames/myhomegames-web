import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { SIDEBAR_SEARCH_SHIELD_Z_INDEX } from "../utils/sidebarSearchMenuStack";

type SidebarSearchInteractionContextValue = {
  blocked: boolean;
  retainInteractionBlock: () => () => void;
};

const SidebarSearchInteractionContext =
  createContext<SidebarSearchInteractionContextValue | null>(null);

export function useSidebarSearchInteraction() {
  return useContext(SidebarSearchInteractionContext);
}

export function SidebarSearchInteractionProvider({ children }: { children: ReactNode }) {
  const [blockCount, setBlockCount] = useState(0);

  const retainInteractionBlock = useCallback(() => {
    setBlockCount((count) => count + 1);
    return () => {
      setBlockCount((count) => Math.max(0, count - 1));
    };
  }, []);

  const blocked = blockCount > 0;
  const value = useMemo(
    () => ({ blocked, retainInteractionBlock }),
    [blocked, retainInteractionBlock],
  );

  return (
    <SidebarSearchInteractionContext.Provider value={value}>
      {children}
      {blocked &&
        createPortal(
          <div
            data-mhg-sidebar-search-interaction-shield
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              zIndex: SIDEBAR_SEARCH_SHIELD_Z_INDEX,
              pointerEvents: "auto",
            }}
          />,
          document.body,
        )}
    </SidebarSearchInteractionContext.Provider>
  );
}
