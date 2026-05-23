import { useLayoutEffect, useState } from "react";
import {
  engageContextRailActivationLock,
  isContextRailActivationLocked,
  subscribeContextRailActivationLock,
} from "../utils/contextRailActivationLock";
import { peekContextRailActivationLockSession } from "../utils/contextRailIndexPeek";

/**
 * Keeps list items in sync with the document-level activation lock engaged on
 * context-rail return (see `engageContextRailActivationLock`).
 */
export function useActivationLockUntilPointerMove(active: boolean): boolean {
  const [locked, setLocked] = useState(
    () =>
      isContextRailActivationLocked() ||
      (active && peekContextRailActivationLockSession()),
  );

  useLayoutEffect(() => {
    if (active && peekContextRailActivationLockSession()) {
      engageContextRailActivationLock();
    }
    setLocked(isContextRailActivationLocked());
    return subscribeContextRailActivationLock(() => {
      setLocked(isContextRailActivationLocked());
    });
  }, [active]);

  return locked;
}
