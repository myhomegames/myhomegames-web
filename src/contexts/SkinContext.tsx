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
import { useSkinAutoUpdateLogic, type SkinUpdatesState } from "../hooks/useSkinAutoUpdate";
import { useServerVersion } from "../hooks/useServerVersion";

type SkinOption = {
  id: string;
  name: string;
  version?: string;
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
  skinUpdates: SkinUpdatesState;
};

const SkinContext = createContext<SkinContextValue | null>(null);

export function SkinProvider({ children }: { children: ReactNode }) {
  const { token, isLoading } = useAuth();
  const { settingsLoaded, skinWeb: settingsSkinWeb, refreshSettings } = useSettings();
  const { version: serverVersion } = useServerVersion();
  const [activeSkinId, setActive] = useState(() => getActiveSkinId());
  const [serverSkins, setServerSkins] = useState<ServerSkinInfo[]>([]);
  const [snapshotVersion, setSnapshotVersion] = useState(() => Date.now());

  const refreshInstalledSkins = useCallback(async () => {
    const list = await fetchSkinList();
    setServerSkins(list);
    setSnapshotVersion(Date.now());
    return list;
  }, []);

  const [skinReloadToken, setSkinReloadToken] = useState(0);

  useEffect(() => {
    const onApiBaseChanged = () => {
      setSkinReloadToken((n) => n + 1);
    };
    window.addEventListener("mhg-api-base-changed", onApiBaseChanged);
    return () => window.removeEventListener("mhg-api-base-changed", onApiBaseChanged);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!settingsLoaded) return;
    let cancelled = false;

    void (async () => {
      let list: ServerSkinInfo[];
      try {
        list = await refreshInstalledSkins();
      } catch {
        // Network/tunnel glitch: keep current theme; do not treat as "no skins".
        return;
      }
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

      // Only clear when the list was fetched successfully and the skin is truly missing.
      if (nextActiveId && list.length > 0) {
        void saveServerActiveSkinId("");
      }
      if (isServerSkinId(nextActiveId) && list.length > 0 && !hasNextSkin) {
        setActiveSkinId("");
        setActive("");
        clearCachedSkinCss();
        applySkinCss("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, settingsLoaded, token, refreshInstalledSkins, skinReloadToken]);

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
        return;
      }
      // Keep cached CSS on transient tunnel failures (common right after TV pairing).
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, settingsLoaded, token, activeSkinId, skinReloadToken]);

  /*
   * `settings.skinWeb` is the authoritative source of the flags consumed by the SPA: the
   * server hydrates it from the active skin's skin.json every time `activeSkinId` changes
   * (see PUT /settings), and keeps user toggles on top of that. We fall back to the skin's
   * declared flags (or the per-skin local cache) only before `settingsLoaded`, so the initial
   * paint reflects the skin instead of the all-false default.
   */
  const activeSkinWeb = useMemo((): SkinWebManifest => {
    if (!isServerSkinId(activeSkinId)) {
      return settingsLoaded ? settingsSkinWeb : normalizeSkinWebManifest(undefined);
    }
    let web: SkinWebManifest;
    if (settingsLoaded) {
      web = settingsSkinWeb;
    } else {
      const fromList = serverSkins.find((s) => s.id === activeSkinId)?.web;
      web = fromList ? normalizeSkinWebManifest(fromList) : getCachedSkinWebOrDefault(activeSkinId);
    }
    return web;
  }, [activeSkinId, settingsLoaded, settingsSkinWeb, serverSkins]);

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
        version: s.version,
        snapshotUrl: s.snapshotUrl,
        snapshotVersion,
      })),
    [serverSkins, snapshotVersion]
  );

  const selectSkin = useCallback(
    async (id: string) => {
      setActiveSkinId(id);
      setActive(id);
      /*
       * Server-side PUT /settings hydrates `settings.skinWeb` from the newly active skin's
       * skin.json; wait for it to complete, then refresh the client-side SettingsContext so
       * the merged manifest becomes visible to consumers (SkinContext.activeSkinWeb, etc.).
       */
      await saveServerActiveSkinId(id);
      await refreshSettings();
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
    },
    [refreshSettings]
  );

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

  const skinUpdates = useSkinAutoUpdateLogic({
    settingsLoaded,
    serverVersion,
    appVersion: __APP_VERSION__,
    skins: serverSkins,
    activeSkinId,
    refreshInstalledSkins,
    selectSkin,
  });

  const value = useMemo(
    () => ({
      activeSkinId,
      activeSkinWeb,
      skins,
      selectSkin,
      uploadSkin,
      deleteSkin,
      refreshInstalledSkins,
      skinUpdates,
    }),
    [
      activeSkinId,
      activeSkinWeb,
      skins,
      selectSkin,
      uploadSkin,
      deleteSkin,
      refreshInstalledSkins,
      skinUpdates,
    ]
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
