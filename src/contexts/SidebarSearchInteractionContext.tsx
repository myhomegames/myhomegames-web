import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  SIDEBAR_SEARCH_SHIELD_Z_INDEX,
  getSidebarSearchStackMounted,
  subscribeSidebarSearchStackMounted,
} from "../utils/sidebarSearchMenuStack";

type SidebarSearchInteractionContextValue = {
  retainInteractionBlock: () => () => void;
};

const SidebarSearchInteractionContext =
  createContext<SidebarSearchInteractionContextValue | null>(null);

let interactionBlockCount = 0;
const interactionBlockListeners = new Set<() => void>();

function emitInteractionBlockChange() {
  for (const listener of interactionBlockListeners) {
    listener();
  }
}

function subscribeInteractionBlocked(listener: () => void) {
  interactionBlockListeners.add(listener);
  return () => {
    interactionBlockListeners.delete(listener);
  };
}

function getInteractionBlockedSnapshot() {
  return interactionBlockCount > 0;
}

export function useSidebarSearchInteraction() {
  return useContext(SidebarSearchInteractionContext);
}

function SidebarSearchInteractionShield() {
  const blocked = useSyncExternalStore(
    subscribeInteractionBlocked,
    getInteractionBlockedSnapshot,
  );
  const stackMounted = useSyncExternalStore(
    subscribeSidebarSearchStackMounted,
    getSidebarSearchStackMounted,
  );

  useLayoutEffect(() => {
    if (blocked) {
      document.body.setAttribute("data-mhg-sidebar-search-stack-active", "");
      return;
    }
    document.body.removeAttribute("data-mhg-sidebar-search-stack-active");
  }, [blocked]);

  // Stack sheets ship their own full-screen dim band; shield only fills handoff gaps.
  if (!blocked || stackMounted) return null;

  return createPortal(
    <div
      className="edit-game-modal-overlay"
      data-mhg-sidebar-search-interaction-shield
      aria-hidden
      style={{
        zIndex: SIDEBAR_SEARCH_SHIELD_Z_INDEX,
        pointerEvents: "auto",
      }}
    />,
    document.body,
  );
}

export function SidebarSearchInteractionProvider({ children }: { children: ReactNode }) {
  const retainInteractionBlock = useCallback(() => {
    interactionBlockCount += 1;
    emitInteractionBlockChange();
    return () => {
      interactionBlockCount = Math.max(0, interactionBlockCount - 1);
      emitInteractionBlockChange();
    };
  }, []);

  return (
    <SidebarSearchInteractionContext.Provider value={{ retainInteractionBlock }}>
      {children}
      <SidebarSearchInteractionShield />
    </SidebarSearchInteractionContext.Provider>
  );
}
