import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isServerVersionCompatible } from "../utils/apiCompatibility";
import { uploadSkinArchive, type ServerSkinInfo } from "../skins/skinApi";
import {
  areSkinsReleaseRequirementsMet,
  downloadSkinArchive,
  fetchSkinsCatalog,
  findOutdatedInstalledSkins,
} from "../skins/skinCatalog";

const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export type SkinUpdateOffer = {
  installedId: string;
  name: string;
  currentVersion: string;
  latestVersion: string;
  zip: string;
  downloadUrl: string;
};

export type SkinUpdatesState = {
  availableUpdates: SkinUpdateOffer[];
  updating: boolean;
  updatingSkinId: string | null;
  applyUpdate: (installedId: string) => Promise<void>;
};

type SkinUpdatesParams = {
  settingsLoaded: boolean;
  serverVersion: string | null;
  appVersion: string;
  skins: Pick<ServerSkinInfo, "id" | "name" | "version">[];
  activeSkinId: string;
  refreshInstalledSkins: () => Promise<ServerSkinInfo[]>;
  selectSkin: (id: string) => Promise<void>;
};

export function useSkinAutoUpdateLogic({
  settingsLoaded,
  serverVersion,
  appVersion,
  skins,
  activeSkinId,
  refreshInstalledSkins,
  selectSkin,
}: SkinUpdatesParams): SkinUpdatesState {
  const [availableUpdates, setAvailableUpdates] = useState<SkinUpdateOffer[]>([]);
  const [updating, setUpdating] = useState(false);
  const [updatingSkinId, setUpdatingSkinId] = useState<string | null>(null);
  const checkInFlightRef = useRef(false);
  const updateInFlightRef = useRef(false);

  const checkForUpdates = useCallback(async () => {
    if (!settingsLoaded || checkInFlightRef.current || updateInFlightRef.current || skins.length === 0) {
      return;
    }
    if (!isServerVersionCompatible(serverVersion)) {
      setAvailableUpdates([]);
      return;
    }

    checkInFlightRef.current = true;
    try {
      const catalog = await fetchSkinsCatalog();
      if (!areSkinsReleaseRequirementsMet(catalog.requires, serverVersion, appVersion)) {
        setAvailableUpdates([]);
        return;
      }
      const outdated = findOutdatedInstalledSkins(skins, catalog.skins);
      setAvailableUpdates(
        outdated.map(({ installed, catalog: entry }) => ({
          installedId: installed.id,
          name: installed.name,
          currentVersion: installed.version?.trim() || "0.0.0",
          latestVersion: entry.version,
          zip: entry.zip,
          downloadUrl: entry.downloadUrl,
        }))
      );
    } catch (err) {
      console.warn("Skin update check failed:", err);
      setAvailableUpdates([]);
    } finally {
      checkInFlightRef.current = false;
    }
  }, [settingsLoaded, serverVersion, appVersion, skins]);

  const applyUpdate = useCallback(
    async (installedId: string) => {
      if (updateInFlightRef.current) return;
      if (!isServerVersionCompatible(serverVersion)) return;

      const offer = availableUpdates.find((u) => u.installedId === installedId);
      if (!offer) return;

      updateInFlightRef.current = true;
      setUpdating(true);
      setUpdatingSkinId(installedId);
      try {
        const wasActive = activeSkinId === installedId;
        const file = await downloadSkinArchive(offer.downloadUrl, offer.zip);
        const { id } = await uploadSkinArchive(file, offer.name);
        await refreshInstalledSkins();
        if (wasActive) {
          await selectSkin(id);
        }
        setAvailableUpdates((prev) => prev.filter((u) => u.installedId !== installedId));
      } catch (err) {
        console.error("Skin update failed:", err);
      } finally {
        updateInFlightRef.current = false;
        setUpdating(false);
        setUpdatingSkinId(null);
      }
    },
    [availableUpdates, activeSkinId, refreshInstalledSkins, selectSkin, serverVersion]
  );

  useEffect(() => {
    if (!settingsLoaded) return;
    void checkForUpdates();
  }, [settingsLoaded, checkForUpdates]);

  useEffect(() => {
    if (!settingsLoaded) return;
    const id = window.setInterval(() => {
      void checkForUpdates();
    }, CHECK_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [settingsLoaded, checkForUpdates]);

  useEffect(() => {
    if (!settingsLoaded) return;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void checkForUpdates();
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [settingsLoaded, checkForUpdates]);

  return useMemo(
    () => ({ availableUpdates, updating, updatingSkinId, applyUpdate }),
    [availableUpdates, updating, updatingSkinId, applyUpdate]
  );
}
