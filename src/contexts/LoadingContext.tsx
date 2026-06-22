import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";

interface LoadingContextType {
  /** Hides page content while initial data is loading. */
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  /** Header / dock spinner only — does not blank the main column. */
  isActivityBusy: boolean;
  setActivityBusy: (busy: boolean) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isActivityBusy, setIsActivityBusy] = useState(false);

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const setActivityBusy = useCallback((busy: boolean) => {
    setIsActivityBusy(busy);
  }, []);

  const value: LoadingContextType = useMemo(
    () => ({
      isLoading,
      setLoading,
      isActivityBusy,
      setActivityBusy,
    }),
    [isLoading, setLoading, isActivityBusy, setActivityBusy]
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}

