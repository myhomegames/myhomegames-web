import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";

export type TitleFilterContextValue = {
  query: string;
  setQuery: (value: string) => void;
};

const TitleFilterContext = createContext<TitleFilterContextValue | null>(null);

export function TitleFilterProvider({ children }: { children: ReactNode }) {
  const [query, setQueryState] = useState("");
  const location = useLocation();

  const setQuery = useCallback((value: string) => {
    setQueryState(value);
  }, []);

  useEffect(() => {
    setQueryState("");
  }, [location.pathname]);

  const value = useMemo(() => ({ query, setQuery }), [query, setQuery]);

  return <TitleFilterContext.Provider value={value}>{children}</TitleFilterContext.Provider>;
}

export function useTitleFilter(): TitleFilterContextValue {
  const ctx = useContext(TitleFilterContext);
  if (!ctx) {
    throw new Error("useTitleFilter must be used within TitleFilterProvider");
  }
  return ctx;
}

/** Safe when provider is absent (e.g. tests); returns "" and no-op setter. */
export function useTitleFilterQuery(): string {
  return useContext(TitleFilterContext)?.query ?? "";
}
