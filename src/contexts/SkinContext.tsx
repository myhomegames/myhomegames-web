import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import {
  BUILTIN_SKIN_EMPTY_ID,
  BUILTIN_SKIN_EMPTY_NAME,
  BUILTIN_SKIN_PLEX_ID,
  BUILTIN_SKIN_PLEX_NAME,
  isBuiltinSkinId,
} from "../skins/skinIds";
import {
  addCustomSkin,
  getActiveSkinId,
  getCustomSkins,
  removeCustomSkin,
  setActiveSkinId,
  type CustomSkinRecord,
} from "../skins/skinStorage";
import { applyActiveSkinFromStorage } from "../skins/skinRuntime";

type SkinOption = {
  id: string;
  name: string;
  builtin: boolean;
};

type SkinContextValue = {
  activeSkinId: string;
  skins: SkinOption[];
  customSkins: CustomSkinRecord[];
  selectSkin: (id: string) => void;
  uploadSkin: (name: string, css: string) => void;
  deleteSkin: (id: string) => void;
  plexCss: string;
  emptySkinCss: string;
};

const SkinContext = createContext<SkinContextValue | null>(null);

export function SkinProvider({
  children,
  plexCss,
  emptySkinCss,
}: {
  children: ReactNode;
  /** Bundled default skin (import with ?raw from main). */
  plexCss: string;
  /** Bundled empty skin for testing skin switching (?raw). */
  emptySkinCss: string;
}) {
  const [activeSkinId, setActive] = useState(() => getActiveSkinId());
  const [customSkins, setCustomSkinsState] = useState<CustomSkinRecord[]>(() => getCustomSkins());

  const skins: SkinOption[] = useMemo(() => {
    const built: SkinOption[] = [
      { id: BUILTIN_SKIN_PLEX_ID, name: BUILTIN_SKIN_PLEX_NAME, builtin: true },
      { id: BUILTIN_SKIN_EMPTY_ID, name: BUILTIN_SKIN_EMPTY_NAME, builtin: true },
    ];
    const customs = customSkins.map((s) => ({ id: s.id, name: s.name, builtin: false }));
    return [...built, ...customs];
  }, [customSkins]);

  const selectSkin = useCallback(
    (id: string) => {
      setActiveSkinId(id);
      setActive(id);
      applyActiveSkinFromStorage({ plex: plexCss, empty: emptySkinCss });
    },
    [plexCss, emptySkinCss]
  );

  const uploadSkin = useCallback(
    (name: string, css: string) => {
      const rec = addCustomSkin(name, css);
      setCustomSkinsState(getCustomSkins());
      selectSkin(rec.id);
    },
    [selectSkin]
  );

  const deleteSkin = useCallback(
    (id: string) => {
      if (isBuiltinSkinId(id)) return;
      removeCustomSkin(id);
      setCustomSkinsState(getCustomSkins());
      setActive(getActiveSkinId());
      applyActiveSkinFromStorage({ plex: plexCss, empty: emptySkinCss });
    },
    [plexCss, emptySkinCss]
  );

  const value = useMemo(
    () => ({
      activeSkinId,
      skins,
      customSkins,
      selectSkin,
      uploadSkin,
      deleteSkin,
      plexCss,
      emptySkinCss,
    }),
    [activeSkinId, skins, customSkins, selectSkin, uploadSkin, deleteSkin, plexCss, emptySkinCss]
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

/** Optional hook when SkinProvider is not mounted (e.g. tests). */
export function useSkinOptional(): SkinContextValue | null {
  return useContext(SkinContext);
}
