import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { useSettings } from "./SettingsContext";
import { isServerSkinId } from "../skins/skinIds";
import { clearCachedSkinCss, setCachedSkinCss } from "../skins/skinCssCache";
import { getActiveSkinId, setActiveSkinId } from "../skins/skinStorage";
import { applySkinCss } from "../skins/skinRuntime";
import { getApiToken } from "../config";
import {
  deleteSkinOnServer,
  fetchServerActiveSkinId,
  fetchServerSkinCss,
  fetchSkinList,
  saveServerActiveSkinId,
  uploadSkinArchive,
  type ServerSkinInfo,
} from "../skins/skinApi";
import { getCachedSkinWebOrDefault, setCachedSkinWeb } from "../skins/skinWebCache";
import { normalizeSkinWebManifest, type SkinWebManifest } from "../skins/skinWebManifest";

type SkinOption = {
  id: string;
  name: string;
  snapshotUrl?: string;
  snapshotVersion: number;
};

type SkinContextValue = {
  activeSkinId: string;
  /** Flags from the active skin's skin.json `web` field (see skinWebManifest). */
  activeSkinWeb: SkinWebManifest;
  skins: SkinOption[];
  selectSkin: (id: string) => Promise<void>;
  uploadSkin: (file: File, displayName?: string) => Promise<void>;
  deleteSkin: (id: string) => Promise<void>;
  refreshInstalledSkins: () => Promise<ServerSkinInfo[]>;
};

const SkinContext = createContext<SkinContextValue | null>(null);

export function SkinProvider({ children }: { children: ReactNode }) {
  const { token, isLoading } = useAuth();
  const { settingsLoaded } = useSettings();
  const [activeSkinId, setActive] = useState(() => getActiveSkinId());
  const [serverSkins, setServerSkins] = useState<ServerSkinInfo[]>([]);
  const [snapshotVersion, setSnapshotVersion] = useState(() => Date.now());

  const refreshInstalledSkins = useCallback(async () => {
    try {
      const list = await fetchSkinList();
      setServerSkins(list);
      setSnapshotVersion(Date.now());
      return list;
    } catch {
      setServerSkins([]);
      setSnapshotVersion(Date.now());
      return [];
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!settingsLoaded) return;
    let cancelled = false;

    void (async () => {
      const list = await refreshInstalledSkins();
      if (cancelled) return;

      const serverActiveId = await fetchServerActiveSkinId().catch(() => "");
      if (cancelled) return;

      const nextActiveId = serverActiveId || getActiveSkinId();
      const hasNextSkin = isServerSkinId(nextActiveId) && list.some((s) => s.id === nextActiveId);

      if (hasNextSkin) {
        setActiveSkinId(nextActiveId);
        setActive(nextActiveId);
        return;
      }

      if (nextActiveId) {
        void saveServerActiveSkinId("");
      }
      if (isServerSkinId(nextActiveId)) {
        setActiveSkinId("");
        setActive("");
        clearCachedSkinCss();
        applySkinCss("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, settingsLoaded, token, refreshInstalledSkins]);

  useEffect(() => {
    if (isLoading) return;
    if (!settingsLoaded) return;
    if (!isServerSkinId(activeSkinId)) return;
    let cancelled = false;
    void (async () => {
      const css = await fetchServerSkinCss(activeSkinId);
      if (cancelled) return;
      if (css?.trim()) {
        setCachedSkinCss(activeSkinId, css);
        applySkinCss(css);
      } else if (getActiveSkinId() === activeSkinId && getApiToken()) {
        clearCachedSkinCss();
        setActiveSkinId("");
        setActive("");
        applySkinCss("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, settingsLoaded, token, activeSkinId]);

  const activeSkinWeb = useMemo((): SkinWebManifest => {
    if (!isServerSkinId(activeSkinId)) {
      return normalizeSkinWebManifest(undefined);
    }
    const fromList = serverSkins.find((s) => s.id === activeSkinId)?.web;
    if (fromList) {
      return normalizeSkinWebManifest(fromList);
    }
    return getCachedSkinWebOrDefault(activeSkinId);
  }, [activeSkinId, serverSkins]);

  useEffect(() => {
    if (!isServerSkinId(activeSkinId)) return;
    const entry = serverSkins.find((s) => s.id === activeSkinId);
    if (entry) {
      setCachedSkinWeb(activeSkinId, entry.web);
    }
  }, [activeSkinId, serverSkins]);

  const skins: SkinOption[] = useMemo(
    () =>
      serverSkins.map((s) => ({
        id: s.id,
        name: s.name,
        snapshotUrl: s.snapshotUrl,
        snapshotVersion,
      })),
    [serverSkins, snapshotVersion]
  );

  const selectSkin = useCallback(async (id: string) => {
    setActiveSkinId(id);
    setActive(id);
    void saveServerActiveSkinId(id);
    if (!id.trim()) {
      clearCachedSkinCss();
      applySkinCss("");
      return;
    }
    if (isServerSkinId(id)) {
      const css = await fetchServerSkinCss(id);
      if (css?.trim()) {
        setCachedSkinCss(id, css);
        applySkinCss(css);
      } else if (getApiToken()) {
        clearCachedSkinCss();
        setActiveSkinId("");
        setActive("");
        applySkinCss("");
      }
    }
  }, []);

  const uploadSkin = useCallback(
    async (file: File, displayName?: string) => {
      const { id } = await uploadSkinArchive(file, displayName);
      await refreshInstalledSkins();
      await selectSkin(id);
    },
    [refreshInstalledSkins, selectSkin]
  );

  const deleteSkin = useCallback(
    async (id: string) => {
      if (!isServerSkinId(id)) return;
      const orderBefore = serverSkins.map((s) => s.id);
      const idx = orderBefore.indexOf(id);
      const wasActive = getActiveSkinId() === id;
      let preferredNextId = "";
      if (idx > 0) {
        preferredNextId = orderBefore[idx - 1];
      } else if (idx === 0 && orderBefore.length > 1) {
        preferredNextId = orderBefore[1];
      }

      await deleteSkinOnServer(id);
      const newList = await refreshInstalledSkins();

      if (!wasActive) return;

      const stillThere =
        preferredNextId &&
        preferredNextId !== id &&
        newList.some((s) => s.id === preferredNextId);
      if (stillThere) {
        await selectSkin(preferredNextId);
      } else if (newList.length > 0) {
        await selectSkin(newList[0].id);
      } else {
        void saveServerActiveSkinId("");
        clearCachedSkinCss();
        setActiveSkinId("");
        setActive("");
        applySkinCss("");
      }
    },
    [refreshInstalledSkins, serverSkins, selectSkin]
  );

  const value = useMemo(
    () => ({
      activeSkinId,
      activeSkinWeb,
      skins,
      selectSkin,
      uploadSkin,
      deleteSkin,
      refreshInstalledSkins,
    }),
    [activeSkinId, activeSkinWeb, skins, selectSkin, uploadSkin, deleteSkin, refreshInstalledSkins]
  );

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin(): SkinContextValue {
  const ctx = useContext(SkinContext);
  if (!ctx) {
    throw new Error("useSkin must be used within SkinProvider");
  }
  return ctx;
}

export function useSkinOptional(): SkinContextValue | null {
  return useContext(SkinContext);
}
