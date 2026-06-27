import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";

import {
  clearPersistedActivity,
  hasPersistedActivityJob,
  readPersistedActivity,
  updatePersistedProgress,
} from "../utils/activitySession";

export type ActivityProgressPhase =
  | "developers"
  | "publishers"
  | "games"
  | "collections"
  | "cache"
  | "developer"
  | "publisher"
  | "game"
  | "collection";

export type ActivityProgress = {
  phase: ActivityProgressPhase;
  percent: number;
};

interface LoadingContextType {
  /** Hides page content while initial data is loading. */
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  /** Header / dock spinner only — does not blank the main column. */
  isActivityBusy: boolean;
  setActivityBusy: (busy: boolean) => void;
  activityProgress: ActivityProgress | null;
  setActivityProgress: (progress: ActivityProgress | null) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

function readInitialActivityState(): {
  isActivityBusy: boolean;
  activityProgress: ActivityProgress | null;
} {
  const persisted = readPersistedActivity();
  if (persisted?.job) {
    return {
      isActivityBusy: true,
      activityProgress: persisted.progress,
    };
  }
  return { isActivityBusy: false, activityProgress: null };
}

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const initialActivity = readInitialActivityState();
  const [isActivityBusy, setIsActivityBusy] = useState(initialActivity.isActivityBusy);
  const [activityProgress, setActivityProgressState] = useState<ActivityProgress | null>(
    initialActivity.activityProgress,
  );

  const setLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const setActivityProgress = useCallback((progress: ActivityProgress | null) => {
    setActivityProgressState(progress);
    if (progress && hasPersistedActivityJob()) {
      updatePersistedProgress(progress);
    }
  }, []);

  const setActivityBusy = useCallback((busy: boolean) => {
    setIsActivityBusy(busy);
    if (!busy) {
      setActivityProgressState(null);
      clearPersistedActivity();
    }
  }, []);

  const value: LoadingContextType = useMemo(
    () => ({
      isLoading,
      setLoading,
      isActivityBusy,
      setActivityBusy,
      activityProgress,
      setActivityProgress,
    }),
    [isLoading, setLoading, isActivityBusy, setActivityBusy, activityProgress, setActivityProgress],
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
