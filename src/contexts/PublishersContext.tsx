import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import type { ReactNode } from "react";
import type { CollectionItem } from "../types";
import { API_BASE, getApiToken } from "../config";
import { buildApiUrl, buildApiHeaders } from "../utils/api";
import { useAuth } from "./AuthContext";

interface PublishersContextType {
  publishers: CollectionItem[];
  isLoading: boolean;
  error: string | null;
  refreshPublishers: () => Promise<void>;
  updatePublisher: (publisher: CollectionItem) => void;
}

const PublishersContext = createContext<PublishersContextType | undefined>(undefined);

export function PublishersProvider({ children }: { children: ReactNode }) {
  const [publishers, setPublishers] = useState<CollectionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isLoading: authLoading, token: authToken } = useAuth();

  const fetchPublishers = useCallback(async () => {
    if (authLoading) return;
    const apiToken = getApiToken() || authToken;
    if (!apiToken) return;

    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    try {
      const url = buildApiUrl(API_BASE, "/publishers");
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = (json.publishers || []).map((v: any) => ({
        id: String(v.id),
        title: v.title,
        summary: v.summary,
        cover: v.cover,
        gameCount: v.gameCount,
        background: v.background,
        showTitle: v.showTitle !== false,
      }));
      setPublishers(items);
    } catch (err: any) {
      clearTimeout(timeoutId);
      setError(String(err.message || err));
    } finally {
      setIsLoading(false);
    }
  }, [authLoading, authToken]);

  useEffect(() => {
    if (authLoading) return;
    if (!getApiToken() && !authToken) {
      setIsLoading(false);
      return;
    }
    const t = setTimeout(fetchPublishers, 1200);
    return () => clearTimeout(t);
  }, [authLoading, authToken, fetchPublishers]);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const ev = e as CustomEvent<{ publisher?: CollectionItem }>;
      if (ev.detail?.publisher) {
        setPublishers((prev) =>
          prev.map((p) => (String(p.id) === String(ev.detail!.publisher!.id) ? ev.detail!.publisher! : p))
        );
      } else {
        fetchPublishers();
      }
    };
    const handleAdded = (e: Event) => {
      const ev = e as CustomEvent<{ publisher: CollectionItem }>;
      const publisher = ev.detail?.publisher;
      if (publisher) {
        setPublishers((prev) =>
          prev.some((p) => String(p.id) === String(publisher.id)) ? prev : [...prev, publisher]
        );
      }
    };
    const handleDeleted = (e: Event) => {
      const ev = e as CustomEvent<{ publisherId: string | number }>;
      const id = ev.detail?.publisherId;
      if (id != null) {
        setPublishers((prev) => prev.filter((p) => String(p.id) !== String(id)));
      }
    };
    const handleGameAdded = () => fetchPublishers();

    window.addEventListener("publisherUpdated", handleUpdate as EventListener);
    window.addEventListener("publisherAdded", handleAdded as EventListener);
    window.addEventListener("publisherDeleted", handleDeleted as EventListener);
    window.addEventListener("metadataReloaded", fetchPublishers);
    window.addEventListener("gameAdded", handleGameAdded);
    return () => {
      window.removeEventListener("publisherUpdated", handleUpdate as EventListener);
      window.removeEventListener("publisherAdded", handleAdded as EventListener);
      window.removeEventListener("publisherDeleted", handleDeleted as EventListener);
      window.removeEventListener("metadataReloaded", fetchPublishers);
      window.removeEventListener("gameAdded", handleGameAdded);
    };
  }, [fetchPublishers]);

  const refreshPublishers = useCallback(() => fetchPublishers(), [fetchPublishers]);
  const updatePublisher = useCallback((publisher: CollectionItem) => {
    setPublishers((prev) =>
      prev.map((p) => (String(p.id) === String(publisher.id) ? publisher : p))
    );
  }, []);

  const value = useMemo(
    () => ({ publishers, isLoading, error, refreshPublishers, updatePublisher }),
    [publishers, isLoading, error, refreshPublishers, updatePublisher]
  );

  return <PublishersContext.Provider value={value}>{children}</PublishersContext.Provider>;
}

export function usePublishers() {
  const ctx = useContext(PublishersContext);
  if (ctx === undefined) throw new Error("usePublishers must be used within PublishersProvider");
  return ctx;
}
