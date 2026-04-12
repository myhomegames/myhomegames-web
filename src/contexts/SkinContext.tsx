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
import { isServerSkinId } from "../skins/skinIds";
import { clearCachedSkinCss, setCachedSkinCss } from "../skins/skinCssCache";
import { getActiveSkinId, setActiveSkinId } from "../skins/skinStorage";
import { applySkinCss } from "../skins/skinRuntime";
import { getApiToken } from "../config";
import {
  deleteSkinOnServer,
  fetchServerSkinCss,
  fetchSkinList,
  uploadSkinArchive,
  type ServerSkinInfo,
} from "../skins/skinApi";

type SkinOption = {
  id: string;
  name: string;
};

type SkinContextValue = {
  activeSkinId: string;
  skins: SkinOption[];
  selectSkin: (id: string) => Promise<void>;
  uploadSkin: (file: File, displayName?: string) => Promise<void>;
  deleteSkin: (id: string) => Promise<void>;
  refreshInstalledSkins: () => Promise<ServerSkinInfo[]>;
};

const SkinContext = createContext<SkinContextValue | null>(null);

export function SkinProvider({ children }: { children: ReactNode }) {
  const { token, isLoading } = useAuth();
  const [activeSkinId, setActive] = useState(() => getActiveSkinId());
  const [serverSkins, setServerSkins] = useState<{ id: string; name: string }[]>([]);

  const refreshInstalledSkins = useCallback(async () => {
    try {
      const list = await fetchSkinList();
      setServerSkins(list);
      return list;
    } catch {
      setServerSkins([]);
      return [];
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;
    let cancelled = false;

    void (async () => {
      const list = await refreshInstalledSkins();
      if (cancelled) return;

      const cur = getActiveSkinId();
      if (isServerSkinId(cur) && !list.some((s) => s.id === cur)) {
        setActiveSkinId("");
        setActive("");
        clearCachedSkinCss();
        applySkinCss("");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isLoading, token, refreshInstalledSkins]);

  useEffect(() => {
    if (isLoading) return;
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
  }, [isLoading, token, activeSkinId]);

  const skins: SkinOption[] = useMemo(
    () => serverSkins.map((s) => ({ id: s.id, name: s.name })),
    [serverSkins]
  );

  const selectSkin = useCallback(async (id: string) => {
    setActiveSkinId(id);
    setActive(id);
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
      await deleteSkinOnServer(id);
      await refreshInstalledSkins();
      if (getActiveSkinId() === id) {
        clearCachedSkinCss();
        setActiveSkinId("");
        setActive("");
        applySkinCss("");
      }
    },
    [refreshInstalledSkins]
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
