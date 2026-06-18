import { useState, useRef, useEffect } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import Tooltip from "../common/Tooltip";
import { useSkin } from "../../contexts/SkinContext";
import { useLatestRelease, type OsKind } from "../../hooks/useLatestRelease";
import { useServerVersion } from "../../hooks/useServerVersion";
import { isServerVersionCompatible, WEB_REQUIRES_MIN_SERVER_VERSION } from "../../utils/apiCompatibility";
const OS_LABEL_KEY: Record<OsKind, string> = {
  win: "header.downloadWindows",
  "mac-arm64": "header.downloadMacArm",
  "mac-x64": "header.downloadMacIntel",
  linux: "header.downloadLinux",
};

export default function UpdateNotification({
  buttonStyle,
  iconStyle,
}: {
  buttonStyle?: CSSProperties;
  iconStyle?: CSSProperties;
} = {}) {
  const { t } = useTranslation();
  const { activeSkinWeb, skinUpdates } = useSkin();
  const { version: serverVersion, loading: serverVersionLoading } = useServerVersion();
  const { updateAvailable, latestVersion, downloadUrl, downloadName, allDownloads, changelog } = useLatestRelease();
  const { availableUpdates, updating: skinUpdating, updatingSkinId, applyUpdate } = skinUpdates;
  const environmentCompatible = isServerVersionCompatible(serverVersion);
  const hasServerUpdate = Boolean(updateAvailable && latestVersion);
  const hasSkinUpdates =
    environmentCompatible && (availableUpdates.length > 0 || skinUpdating);
  const serverUpdateRequired = !environmentCompatible && hasServerUpdate;
  /** PS3 renders the update panel as a fixed right sheet; portal avoids dock `transform` clipping. */
  const portaledPopup = activeSkinWeb.disableTitleTooltips;
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) return;
    buttonRef.current?.blur();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (menuRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setIsOpen(false);
    }
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside, true);
    }, 100);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleDownload = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  const handleSkinUpdate = (installedId: string) => {
    void applyUpdate(installedId);
  };

  const primaryUrl = downloadUrl ?? null;
  const otherDownloads = primaryUrl
    ? allDownloads.filter((d) => d.url !== primaryUrl)
    : allDownloads;

  if (serverVersionLoading || (!hasServerUpdate && !hasSkinUpdates)) {
    return null;
  }

  const updatingOffer = skinUpdating
    ? availableUpdates.find((u) => u.installedId === updatingSkinId)
    : null;

  const tooltipText =
    skinUpdating && updatingOffer
      ? t("header.updatingSkin", "Updating {{name}}…", { name: updatingOffer.name })
      : serverUpdateRequired
        ? t("header.serverCompatibilityMismatch", "Server update required")
        : t("header.updateAvailable", "New update available");

  const popup = (
    <div
      ref={popupRef}
      className="update-notification-popup"
      onMouseDown={(event) => {
        /* PS3 full-viewport overlay: close when clicking the dim band (not the right sheet). */
        if (portaledPopup && event.target === event.currentTarget) {
          setIsOpen(false);
        }
      }}
    >
      {hasServerUpdate && (
        <>
          <div className="update-notification-header">
            {serverUpdateRequired
              ? t("header.serverCompatibilityDetail", {
                  required: WEB_REQUIRES_MIN_SERVER_VERSION,
                  version: serverVersion ?? "—",
                  defaultValue:
                    "This web app requires server version {{required}} or newer. The connected server is {{version}}. Update the server to a matching release.",
                })
              : t("header.newVersionAvailable", "New version {{version}} available", {
                  version: latestVersion,
                })}
          </div>
          {changelog && (
            <div className="update-notification-changelog">
              <div className="update-notification-changelog-title">
                {t("header.changelog", "Changelog")}
              </div>
              <div className="update-notification-changelog-body">{changelog}</div>
            </div>
          )}
          <div className="update-notification-downloads">
            {primaryUrl && downloadName && (
              <button
                type="button"
                className="update-notification-download-primary"
                onClick={() => handleDownload(primaryUrl)}
              >
                {t("header.downloadServer", "Download server")} ({downloadName})
              </button>
            )}
            {otherDownloads.map(({ os, url, name }) => (
              <button
                key={url + name}
                type="button"
                className="update-notification-download-item"
                onClick={() => handleDownload(url)}
              >
                {t(OS_LABEL_KEY[os], name)} — {name}
              </button>
            ))}
          </div>
        </>
      )}
      {hasSkinUpdates && (
        <div className={hasServerUpdate ? "update-notification-skin-updates" : undefined}>
          {availableUpdates.map((offer) => {
            const isUpdatingThis = skinUpdating && updatingSkinId === offer.installedId;
            return (
              <div key={offer.installedId} className="update-notification-skin-update">
                <div className="update-notification-header">
                  {isUpdatingThis
                    ? t("header.updatingSkin", "Updating {{name}}…", { name: offer.name })
                    : t("header.skinNewVersionAvailable", "{{name}}: new version {{version}} available", {
                        name: offer.name,
                        version: offer.latestVersion,
                      })}
                </div>
                {!isUpdatingThis && (
                  <div className="update-notification-downloads">
                    <button
                      type="button"
                      className="update-notification-download-primary"
                      disabled={skinUpdating}
                      onClick={() => handleSkinUpdate(offer.installedId)}
                    >
                      {t("header.updateSkin", "Update skin")} ({offer.name})
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div ref={menuRef} className="update-notification-wrapper">
      <Tooltip text={tooltipText} position="top" delay={200}>
        <button
          ref={buttonRef}
          type="button"
          className="update-notification-button mhg-header-button"
          onClick={handleToggle}
          aria-label={tooltipText}
          aria-expanded={isOpen}
          style={buttonStyle}
        >
          <svg
            width="20"
            height="20"
            style={iconStyle}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
            className="update-notification-bell"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
            <circle cx="18" cy="6" r="2.5" fill="currentColor" className="update-notification-dot" />
          </svg>
        </button>
      </Tooltip>

      {isOpen &&
        (portaledPopup && typeof document !== "undefined"
          ? createPortal(popup, document.body)
          : popup)}
    </div>
  );
}
