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
import { BUILTIN_SKIN_PLEX_ID, BUILTIN_SKIN_PLEX_NAME, isBuiltinSkinId, isServerSkinId } from "../skins/skinIds";
import { getActiveSkinId, setActiveSkinId } from "../skins/skinStorage";
import { applyActiveSkinFromStorage, applySkinCss } from "../skins/skinRuntime";
import { getApiToken } from "../config";
import { deleteSkinOnServer, fetchServerSkinCss, fetchSkinList, uploadSkinArchive } from "../skins/skinApi";

type SkinOption = {
  id: string;
  name: string;
  builtin: boolean;
};

type SkinContextValue = {
  activeSkinId: string;
  skins: SkinOption[];
  selectSkin: (id: string) => Promise<void>;
  uploadSkin: (file: File, displayName?: string) => Promise<void>;
  deleteSkin: (id: string) => Promise<void>;
  refreshInstalledSkins: () => Promise<void>;
};

const SkinContext = createContext<SkinContextValue | null>(null);

export function SkinProvider({ children, plexCss }: { children: ReactNode; plexCss: string }) {
  const { token, isLoading } = useAuth();
  const [activeSkinId, setActive] = useState(() => getActiveSkinId());
  const [serverSkins, setServerSkins] = useState<{ id: string; name: string }[]>([]);

  const bundled = useMemo(() => ({ plex: plexCss }), [plexCss]);

  const refreshInstalledSkins = useCallback(async () => {
    const list = await fetchSkinList();
    setServerSkins(list);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    void refreshInstalledSkins();
  }, [isLoading, token, refreshInstalledSkins]);

  useEffect(() => {
    if (isLoading) return;
    if (!isServerSkinId(activeSkinId)) return;
    let cancelled = false;
    void (async () => {
      const css = await fetchServerSkinCss(activeSkinId);
      if (cancelled) return;
      if (css?.trim()) {
        applySkinCss(css);
      } else if (getActiveSkinId() === activeSkinId && getApiToken()) {
        setActiveSkinId(BUILTIN_SKIN_PLEX_ID);
        setActive(BUILTIN_SKIN_PLEX_ID);
        applyActiveSkinFromStorage(bundled);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoading, token, activeSkinId, bundled]);

  const skins: SkinOption[] = useMemo(() => {
    const built: SkinOption[] = [{ id: BUILTIN_SKIN_PLEX_ID, name: BUILTIN_SKIN_PLEX_NAME, builtin: true }];
    const fromServer = serverSkins.map((s) => ({ id: s.id, name: s.name, builtin: false }));
    return [...built, ...fromServer];
  }, [serverSkins]);

  const selectSkin = useCallback(
    async (id: string) => {
      setActiveSkinId(id);
      setActive(id);
      if (isBuiltinSkinId(id)) {
        applyActiveSkinFromStorage(bundled);
        return;
      }
      if (isServerSkinId(id)) {
        const css = await fetchServerSkinCss(id);
        if (css?.trim()) {
          applySkinCss(css);
        } else if (getApiToken()) {
          setActiveSkinId(BUILTIN_SKIN_PLEX_ID);
          setActive(BUILTIN_SKIN_PLEX_ID);
          applyActiveSkinFromStorage(bundled);
        }
      }
    },
    [bundled]
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
      if (isBuiltinSkinId(id)) return;
      if (!isServerSkinId(id)) return;
      await deleteSkinOnServer(id);
      await refreshInstalledSkins();
      if (getActiveSkinId() === id) {
        setActiveSkinId(BUILTIN_SKIN_PLEX_ID);
        setActive(BUILTIN_SKIN_PLEX_ID);
        applyActiveSkinFromStorage(bundled);
      }
    },
    [bundled, refreshInstalledSkins]
  );

  const value = useMemo(
    () => ({
      activeSkinId,
      skins,
      selectSkin,
      uploadSkin,
      deleteSkin,
      refreshInstalledSkins,
    }),
    [activeSkinId, skins, selectSkin, uploadSkin, deleteSkin, refreshInstalledSkins]
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
