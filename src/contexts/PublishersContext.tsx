import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import type { CollectionItem } from "../types";
import { API_BASE } from "../config";
import { buildApiUrl, buildApiHeaders } from "../utils/api";
import { useAuth } from "./AuthContext";
import { useSettings } from "./SettingsContext";
import {
  mergeCompanyProfileOntoItem,
  type CompanyProfilePatch,
} from "../utils/companyProfileSync";
import { filterRootCollectionLikes } from "../utils/stringUtils";
import {
  readPublishersSessionCache,
  recordToGameIdsMap,
  writePublishersSessionCache,
} from "../utils/sessionPageCache";

interface PublishersContextType {
  publishers: CollectionItem[];
  /** Root-level publishers only (excludes items linked as children). */
  rootPublishers: CollectionItem[];
  /** Map publisher id -> library game ids (for filters). */
  publisherGameIds: Map<string, string[]>;
  isLoading: boolean;
  error: string | null;
  refreshPublishers: () => Promise<void>;
  updatePublisher: (publisher: CollectionItem) => void;
}

const PublishersContext = createContext<PublishersContextType | undefined>(undefined);

export function PublishersProvider({ children }: { children: ReactNode }) {
  const cachedPublishers = readPublishersSessionCache();
  const [publishers, setPublishers] = useState<CollectionItem[]>(
    () => cachedPublishers?.items ?? [],
  );
  const [publisherGameIds, setPublisherGameIds] = useState<Map<string, string[]>>(
    () => recordToGameIdsMap(cachedPublishers?.gameIds ?? {}),
  );
  const [isLoading, setIsLoading] = useState(
    () => (cachedPublishers?.items.length ?? 0) === 0,
  );
  const [error, setError] = useState<string | null>(null);
  const publishersRef = useRef(publishers);
  publishersRef.current = publishers;
  const cacheWriteEnabledRef = useRef((cachedPublishers?.items.length ?? 0) > 0);
  const { isLoading: authLoading } = useAuth();
  const { settingsLoaded } = useSettings();

  const fetchPublishers = useCallback(async () => {
    if (authLoading) return;
    if (!settingsLoaded) return;

    const showLoading = publishersRef.current.length === 0;
    if (showLoading) {
      setIsLoading(true);
    }
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
        childs: Array.isArray(v.childs) ? v.childs : [],
      }));
      setPublishers(items);
      setPublisherGameIds((prev) => {
        const updated = new Map(prev);
        for (const v of json.publishers || []) {
          if (Array.isArray(v.gameIds)) {
            updated.set(
              String(v.id),
              v.gameIds.map((id: string | number) => String(id)),
            );
          }
        }
        cacheWriteEnabledRef.current = true;
        writePublishersSessionCache(items, updated);
        return updated;
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      setError(String(err.message || err));
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  }, [authLoading, settingsLoaded]);

  useEffect(() => {
    if (authLoading) return;
    if (!settingsLoaded) return;
    const t = setTimeout(fetchPublishers, 1200);
    return () => clearTimeout(t);
  }, [authLoading, settingsLoaded, fetchPublishers]);

  useEffect(() => {
    if (!cacheWriteEnabledRef.current) return;
    writePublishersSessionCache(publishers, publisherGameIds);
  }, [publishers, publisherGameIds]);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const ev = e as CustomEvent<{ publisher?: CollectionItem }>;
      if (ev.detail?.publisher) {
        const updated = ev.detail.publisher;
        setPublishers((prev) =>
          prev.map((p) =>
            String(p.id) === String(updated.id) ? { ...p, ...updated } : p
          )
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
    const handleCompanyProfileUpdated = (e: Event) => {
      const ev = e as CustomEvent<{ profile?: CompanyProfilePatch }>;
      const profile = ev.detail?.profile;
      if (!profile?.id) return;
      setPublishers((prev) =>
        prev.map((item) => mergeCompanyProfileOntoItem(item, profile)),
      );
    };
    const handleChildLinked = (e: Event) => {
      const ev = e as CustomEvent<{
        resourceType?: string;
        parentId?: string | number;
        childId?: string | number;
      }>;
      if (ev.detail?.resourceType !== "publishers") return;
      const { parentId, childId } = ev.detail;
      if (parentId == null || childId == null) return;
      setPublishers((prev) =>
        prev.map((item) => {
          if (String(item.id) !== String(parentId)) return item;
          const childs = Array.isArray(item.childs) ? item.childs : [];
          if (childs.some((id) => String(id) === String(childId))) return item;
          return { ...item, childs: [...childs, childId] };
        }),
      );
    };

    window.addEventListener("publisherUpdated", handleUpdate as EventListener);
    window.addEventListener("companyProfileUpdated", handleCompanyProfileUpdated as EventListener);
    window.addEventListener("collectionLikeChildLinked", handleChildLinked as EventListener);
    window.addEventListener("publisherAdded", handleAdded as EventListener);
    window.addEventListener("publisherDeleted", handleDeleted as EventListener);
    window.addEventListener("metadataReloaded", fetchPublishers);
    window.addEventListener("mhg-language-changed", fetchPublishers);
    window.addEventListener("gameAdded", handleGameAdded);
    window.addEventListener("gameDeleted", handleGameAdded);
    return () => {
      window.removeEventListener("publisherUpdated", handleUpdate as EventListener);
      window.removeEventListener("companyProfileUpdated", handleCompanyProfileUpdated as EventListener);
      window.removeEventListener("collectionLikeChildLinked", handleChildLinked as EventListener);
      window.removeEventListener("publisherAdded", handleAdded as EventListener);
      window.removeEventListener("publisherDeleted", handleDeleted as EventListener);
      window.removeEventListener("metadataReloaded", fetchPublishers);
      window.removeEventListener("mhg-language-changed", fetchPublishers);
      window.removeEventListener("gameAdded", handleGameAdded);
      window.removeEventListener("gameDeleted", handleGameAdded);
    };
  }, [fetchPublishers]);

  const refreshPublishers = useCallback(() => fetchPublishers(), [fetchPublishers]);
  const updatePublisher = useCallback((publisher: CollectionItem) => {
    setPublishers((prev) =>
      prev.map((p) => (String(p.id) === String(publisher.id) ? publisher : p))
    );
  }, []);

  const rootPublishers = useMemo(
    () => filterRootCollectionLikes(publishers),
    [publishers],
  );

  const value = useMemo(
    () => ({
      publishers,
      rootPublishers,
      publisherGameIds,
      isLoading,
      error,
      refreshPublishers,
      updatePublisher,
    }),
    [publishers, rootPublishers, publisherGameIds, isLoading, error, refreshPublishers, updatePublisher],
  );

  return <PublishersContext.Provider value={value}>{children}</PublishersContext.Provider>;
}

export function usePublishers() {
  const ctx = useContext(PublishersContext);
  if (ctx === undefined) throw new Error("usePublishers must be used within PublishersProvider");
  return ctx;
}
