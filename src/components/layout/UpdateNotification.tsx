import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import Tooltip from "../common/Tooltip";
import { useSkin } from "../../contexts/SkinContext";
import { useLatestRelease, type OsKind } from "../../hooks/useLatestRelease";
const OS_LABEL_KEY: Record<OsKind, string> = {
  win: "header.downloadWindows",
  "mac-arm64": "header.downloadMacArm",
  "mac-x64": "header.downloadMacIntel",
  linux: "header.downloadLinux",
};

export default function UpdateNotification() {
  const { t } = useTranslation();
  const { activeSkinWeb } = useSkin();
  const { updateAvailable, latestVersion, downloadUrl, downloadName, allDownloads, changelog } = useLatestRelease();
  /** PS3 renders the update panel as a fixed right sheet; portal avoids dock `transform` clipping. */
  const portaledPopup = activeSkinWeb.disableTitleTooltips;
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

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

  const primaryUrl = downloadUrl ?? null;
  const otherDownloads = primaryUrl
    ? allDownloads.filter((d) => d.url !== primaryUrl)
    : allDownloads;

  if (!updateAvailable || !latestVersion) return null;

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
      <div className="update-notification-header">
        {t("header.newVersionAvailable", "New version {{version}} available", { version: latestVersion })}
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
    </div>
  );

  return (
    <div ref={menuRef} className="update-notification-wrapper">
      <Tooltip text={t("header.updateAvailable", "New update available")} position="top" delay={200}>
        <button
          type="button"
          className="update-notification-button mhg-header-button"
          onClick={handleToggle}
          aria-label={t("header.updateAvailable", "New update available")}
          aria-expanded={isOpen}
        >
          <svg
            width="20"
            height="20"
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
