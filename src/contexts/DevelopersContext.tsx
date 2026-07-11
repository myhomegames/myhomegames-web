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
  readDevelopersSessionCache,
  recordToGameIdsMap,
  writeDevelopersSessionCache,
} from "../utils/sessionPageCache";

interface DevelopersContextType {
  developers: CollectionItem[];
  /** Root-level developers only (excludes items linked as children). */
  rootDevelopers: CollectionItem[];
  /** Map developer id -> library game ids (for filters). */
  developerGameIds: Map<string, string[]>;
  isLoading: boolean;
  error: string | null;
  refreshDevelopers: () => Promise<void>;
  updateDeveloper: (developer: CollectionItem) => void;
}

const DevelopersContext = createContext<DevelopersContextType | undefined>(undefined);

export function DevelopersProvider({ children }: { children: ReactNode }) {
  const cachedDevelopers = readDevelopersSessionCache();
  const [developers, setDevelopers] = useState<CollectionItem[]>(
    () => cachedDevelopers?.items ?? [],
  );
  const [developerGameIds, setDeveloperGameIds] = useState<Map<string, string[]>>(
    () => recordToGameIdsMap(cachedDevelopers?.gameIds ?? {}),
  );
  const [isLoading, setIsLoading] = useState(
    () => (cachedDevelopers?.items.length ?? 0) === 0,
  );
  const [error, setError] = useState<string | null>(null);
  const developersRef = useRef(developers);
  developersRef.current = developers;
  const cacheWriteEnabledRef = useRef((cachedDevelopers?.items.length ?? 0) > 0);
  const { isLoading: authLoading } = useAuth();
  const { settingsLoaded } = useSettings();

  const fetchDevelopers = useCallback(async () => {
    if (authLoading) return;
    if (!settingsLoaded) return;

    const showLoading = developersRef.current.length === 0;
    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);
    try {
      const url = buildApiUrl(API_BASE, "/developers");
      const res = await fetch(url, {
        headers: buildApiHeaders({ Accept: "application/json" }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const items = (json.developers || []).map((v: any) => ({
        id: String(v.id),
        title: v.title,
        summary: v.summary,
        cover: v.cover,
        gameCount: v.gameCount,
        background: v.background,
        showTitle: v.showTitle !== false,
        childs: Array.isArray(v.childs) ? v.childs : [],
      }));
      setDevelopers(items);
      setDeveloperGameIds((prev) => {
        const updated = new Map(prev);
        for (const v of json.developers || []) {
          if (Array.isArray(v.gameIds)) {
            updated.set(
              String(v.id),
              v.gameIds.map((id: string | number) => String(id)),
            );
          }
        }
        cacheWriteEnabledRef.current = true;
        writeDevelopersSessionCache(items, updated);
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
    const t = setTimeout(fetchDevelopers, 800);
    return () => clearTimeout(t);
  }, [authLoading, settingsLoaded, fetchDevelopers]);

  useEffect(() => {
    if (!cacheWriteEnabledRef.current) return;
    writeDevelopersSessionCache(developers, developerGameIds);
  }, [developers, developerGameIds]);

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const ev = e as CustomEvent<{ developer?: CollectionItem }>;
      if (ev.detail?.developer) {
        const updated = ev.detail.developer;
        setDevelopers((prev) =>
          prev.map((d) =>
            String(d.id) === String(updated.id) ? { ...d, ...updated } : d
          )
        );
      } else {
        fetchDevelopers();
      }
    };
    const handleAdded = (e: Event) => {
      const ev = e as CustomEvent<{ developer: CollectionItem }>;
      const developer = ev.detail?.developer;
      if (developer) {
        setDevelopers((prev) =>
          prev.some((d) => String(d.id) === String(developer.id)) ? prev : [...prev, developer]
        );
      }
    };
    const handleDeleted = (e: Event) => {
      const ev = e as CustomEvent<{ developerId: string | number }>;
      const id = ev.detail?.developerId;
      if (id != null) {
        setDevelopers((prev) => prev.filter((d) => String(d.id) !== String(id)));
      }
    };
    const handleGameAdded = () => fetchDevelopers();
    const handleCompanyProfileUpdated = (e: Event) => {
      const ev = e as CustomEvent<{ profile?: CompanyProfilePatch }>;
      const profile = ev.detail?.profile;
      if (!profile?.id) return;
      setDevelopers((prev) =>
        prev.map((item) => mergeCompanyProfileOntoItem(item, profile)),
      );
    };
    const handleChildLinked = (e: Event) => {
      const ev = e as CustomEvent<{
        resourceType?: string;
        parentId?: string | number;
        childId?: string | number;
      }>;
      if (ev.detail?.resourceType !== "developers") return;
      const { parentId, childId } = ev.detail;
      if (parentId == null || childId == null) return;
      setDevelopers((prev) =>
        prev.map((item) => {
          if (String(item.id) !== String(parentId)) return item;
          const childs = Array.isArray(item.childs) ? item.childs : [];
          if (childs.some((id) => String(id) === String(childId))) return item;
          return { ...item, childs: [...childs, childId] };
        }),
      );
    };

    window.addEventListener("developerUpdated", handleUpdate as EventListener);
    window.addEventListener("companyProfileUpdated", handleCompanyProfileUpdated as EventListener);
    window.addEventListener("collectionLikeChildLinked", handleChildLinked as EventListener);
    window.addEventListener("developerAdded", handleAdded as EventListener);
    window.addEventListener("developerDeleted", handleDeleted as EventListener);
    window.addEventListener("metadataReloaded", fetchDevelopers);
    window.addEventListener("mhg-language-changed", fetchDevelopers);
    window.addEventListener("gameAdded", handleGameAdded);
    window.addEventListener("gameDeleted", handleGameAdded);
    return () => {
      window.removeEventListener("developerUpdated", handleUpdate as EventListener);
      window.removeEventListener("companyProfileUpdated", handleCompanyProfileUpdated as EventListener);
      window.removeEventListener("collectionLikeChildLinked", handleChildLinked as EventListener);
      window.removeEventListener("developerAdded", handleAdded as EventListener);
      window.removeEventListener("developerDeleted", handleDeleted as EventListener);
      window.removeEventListener("metadataReloaded", fetchDevelopers);
      window.removeEventListener("mhg-language-changed", fetchDevelopers);
      window.removeEventListener("gameAdded", handleGameAdded);
      window.removeEventListener("gameDeleted", handleGameAdded);
    };
  }, [fetchDevelopers]);

  const refreshDevelopers = useCallback(() => fetchDevelopers(), [fetchDevelopers]);
  const updateDeveloper = useCallback((developer: CollectionItem) => {
    setDevelopers((prev) =>
      prev.map((d) => (String(d.id) === String(developer.id) ? developer : d))
    );
  }, []);

  const rootDevelopers = useMemo(
    () => filterRootCollectionLikes(developers),
    [developers],
  );

  const value = useMemo(
    () => ({
      developers,
      rootDevelopers,
      developerGameIds,
      isLoading,
      error,
      refreshDevelopers,
      updateDeveloper,
    }),
    [developers, rootDevelopers, developerGameIds, isLoading, error, refreshDevelopers, updateDeveloper],
  );

  return <DevelopersContext.Provider value={value}>{children}</DevelopersContext.Provider>;
}

export function useDevelopers() {
  const ctx = useContext(DevelopersContext);
  if (ctx === undefined) throw new Error("useDevelopers must be used within DevelopersProvider");
  return ctx;
}
