import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

type TopDockSlotContextValue = {
  /** DOM element that hosts the page toolbar inside the top-right tool dock, or null when the skin does not use the dock. */
  slotEl: HTMLElement | null;
  /** Ref callback used by the dock to register/unregister the slot element. */
  registerSlot: (el: HTMLElement | null) => void;
};

const TopDockSlotContext = createContext<TopDockSlotContextValue>({
  slotEl: null,
  registerSlot: () => {},
});

export function TopDockSlotProvider({ children }: { children: ReactNode }) {
  const [slotEl, setSlotEl] = useState<HTMLElement | null>(null);
  const value = useMemo<TopDockSlotContextValue>(
    () => ({ slotEl, registerSlot: setSlotEl }),
    [slotEl]
  );
  return <TopDockSlotContext.Provider value={value}>{children}</TopDockSlotContext.Provider>;
}

export function useTopDockSlot(): TopDockSlotContextValue {
  return useContext(TopDockSlotContext);
}
