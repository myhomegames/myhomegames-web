import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { API_BASE, getApiToken } from "../config";
import { buildApiUrl, buildApiHeaders } from "../utils/api";
import { useAuth } from "./AuthContext";
import { useSettings } from "./SettingsContext";

export type TagLabelsMap = {
  categories: Map<string, string>;
  themes: Map<string, string>;
  platforms: Map<string, string>;
  gameModes: Map<string, string>;
  playerPerspectives: Map<string, string>;
  gameEngines: Map<string, string>;
  franchises: Map<string, string>;
  series: Map<string, string>;
};

const emptyMaps = (): TagLabelsMap => ({
  categories: new Map(),
  themes: new Map(),
  platforms: new Map(),
  gameModes: new Map(),
  playerPerspectives: new Map(),
  gameEngines: new Map(),
  franchises: new Map(),
  series: new Map(),
});

interface TagListsContextType {
  tagLabels: TagLabelsMap;
  tagLabelsReady: boolean;
  refreshTagLists: () => Promise<void>;
}

const TagListsContext = createContext<TagListsContextType | undefined>(undefined);

const ENDPOINTS: [keyof TagLabelsMap, string, string][] = [
  ["categories", "/categories", "categories"],
  ["themes", "/themes", "themes"],
  ["platforms", "/platforms", "platforms"],
  ["gameModes", "/game-modes", "gameModes"],
  ["playerPerspectives", "/player-perspectives", "playerPerspectives"],
  ["gameEngines", "/game-engines", "gameEngines"],
  ["franchises", "/franchises", "franchises"],
  ["series", "/series", "series"],
];

export function TagListsProvider({ children }: { children: ReactNode }) {
  const [tagLabels, setTagLabels] = useState<TagLabelsMap>(emptyMaps);
  const [tagLabelsReady, setTagLabelsReady] = useState(false);
  const { isLoading: authLoading, token: authToken } = useAuth();
  const { twitchLoginEnabled, settingsLoaded } = useSettings();

  const refreshTagLists = useCallback(async () => {
    if (authLoading) return;
    if (!settingsLoaded) return;
    if (twitchLoginEnabled && !getApiToken() && !authToken) return;

    const headers = buildApiHeaders({ Accept: "application/json" });
    const results = await Promise.all(
      ENDPOINTS.map(async ([key, path, listKey]) => {
        const res = await fetch(buildApiUrl(API_BASE, path), { headers });
        if (!res.ok) return { key, map: new Map<string, string>() };
        const json = await res.json();
        const list = (json[listKey] || []) as Array<{
          id: number | string;
          title?: string;
          name?: string;
        }>;
        const map = new Map<string, string>();
        for (const item of list) {
          const id = String(item.id);
          map.set(id, item.title ?? item.name ?? id);
        }
        return { key, map };
      })
    );
    setTagLabels((prev) => {
      const next = { ...prev };
      for (const { key, map } of results) next[key] = map;
      return next;
    });
  }, [authLoading, authToken, twitchLoginEnabled, settingsLoaded]);

  useEffect(() => {
    if (authLoading) return;
    if (!settingsLoaded) {
      setTagLabelsReady(true);
      return;
    }
    if (twitchLoginEnabled && !getApiToken() && !authToken) {
      setTagLabelsReady(true);
      return;
    }
    setTagLabelsReady(false);
    refreshTagLists().finally(() => setTagLabelsReady(true));
  }, [authLoading, authToken, twitchLoginEnabled, settingsLoaded, refreshTagLists]);

  // When a new game is added (possibly with new tags), refresh tag lists so new tags show titles instead of ids
  useEffect(() => {
    const handleGameAdded = () => refreshTagLists();
    window.addEventListener("gameAdded", handleGameAdded);
    return () => window.removeEventListener("gameAdded", handleGameAdded);
  }, [refreshTagLists]);

  // When a tag list is updated (e.g. from EditTagModal for any tag type), refresh so labels stay in sync
  useEffect(() => {
    const handleTagListUpdated = () => refreshTagLists();
    const handleMetadataReloaded = () => refreshTagLists();
    window.addEventListener("tagListUpdated", handleTagListUpdated as EventListener);
    window.addEventListener("metadataReloaded", handleMetadataReloaded);
    return () => {
      window.removeEventListener("tagListUpdated", handleTagListUpdated as EventListener);
      window.removeEventListener("metadataReloaded", handleMetadataReloaded);
    };
  }, [refreshTagLists]);

  const value = { tagLabels, tagLabelsReady, refreshTagLists };
  return (
    <TagListsContext.Provider value={value}>
      {children}
    </TagListsContext.Provider>
  );
}

export function useTagLists(): TagListsContextType {
  const ctx = useContext(TagListsContext);
  if (ctx === undefined) {
    throw new Error("useTagLists must be used within TagListsProvider");
  }
  return ctx;
}
