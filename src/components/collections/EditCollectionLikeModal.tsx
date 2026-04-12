import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { API_BASE, API_TOKEN, getApiToken } from "../../config";
import { useLoading } from "../../contexts/LoadingContext";
import Cover from "../games/Cover";
import type { CollectionInfo } from "../../types";
import { buildApiUrl } from "../../utils/api";
import { normalizeGameCoverImage, normalizeWideImage } from "../../utils/imageUploadNormalize";
import "../games/edit/EditGameMediaTab.css";
import "./EditCollectionLikeModal.css";

function normExt(s: string | null | undefined) {
  return (s ?? "").trim();
}
function initialExternalCoverUrl(item: CollectionInfo): string {
  const e = item.externalCoverUrl?.trim();
  if (e) return e;
  const c = item.cover?.split("?")[0] ?? "";
  return c.startsWith("http") ? c : "";
}

function initialExternalBackgroundUrl(item: CollectionInfo): string {
  const e = item.externalBackgroundUrl?.trim();
  if (e) return e;
  const b = item.background?.split("?")[0] ?? "";
  return b.startsWith("http") ? b : "";
}

export type CollectionLikeResourceType = "collections" | "developers" | "publishers";

/** Merge cover from save: server null must not fall back to previous item.cover (?? would do that). */
function coverAfterSave(
  updatedFromUploadOrDelete: string | null,
  apiData: { cover?: string | null } | null | undefined,
  previousCover: string | undefined
): string | undefined {
  if (updatedFromUploadOrDelete != null && updatedFromUploadOrDelete !== "") {
    return updatedFromUploadOrDelete;
  }
  if (apiData != null) {
    const c = apiData.cover ?? null;
    return c === null ? undefined : c;
  }
  return previousCover;
}

function backgroundAfterSave(
  updatedFromUploadOrDelete: string | null,
  apiData: { background?: string | null } | null | undefined,
  previousBackground: string | undefined,
  hasBackground: boolean
): string | undefined {
  if (!hasBackground) return undefined;
  if (updatedFromUploadOrDelete != null && updatedFromUploadOrDelete !== "") {
    return updatedFromUploadOrDelete;
  }
  if (apiData != null) {
    const b = apiData.background ?? null;
    return b === null ? undefined : b;
  }
  return previousBackground;
}

const RESOURCE_CONFIG: Record<
  CollectionLikeResourceType,
  { routeBase: string; responseKey: string; coverPrefix: string; backgroundPrefix: string; titleKey: string }
> = {
  collections: {
    routeBase: "collections",
    responseKey: "collection",
    coverPrefix: "collection-covers",
    backgroundPrefix: "collection-backgrounds",
    titleKey: "collectionDetail.editCollection",
  },
  developers: {
    routeBase: "developers",
    responseKey: "developer",
    coverPrefix: "developer-covers",
    backgroundPrefix: "developer-backgrounds",
    titleKey: "igdbInfo.editDeveloper",
  },
  publishers: {
    routeBase: "publishers",
    responseKey: "publisher",
    coverPrefix: "publisher-covers",
    backgroundPrefix: "publisher-backgrounds",
    titleKey: "igdbInfo.editPublisher",
  },
};

type EditCollectionLikeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  resourceType: CollectionLikeResourceType;
  item: CollectionInfo;
  onItemUpdate: (updatedItem: CollectionInfo) => void;
};

export default function EditCollectionLikeModal({
  isOpen,
  onClose,
  resourceType,
  item,
  onItemUpdate,
}: EditCollectionLikeModalProps) {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const config = RESOURCE_CONFIG[resourceType];
  const hasBackground = true;
  const hasShowTitle = true;

  const [title, setTitle] = useState(item.title);
  const [summary, setSummary] = useState(item.summary || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"INFO" | "MEDIA">("INFO");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState<number>(Date.now());
  const [showTitleInPreview, setShowTitleInPreview] = useState(false);
  const [localExternalCover, setLocalExternalCover] = useState("");
  const [localExternalBackground, setLocalExternalBackground] = useState("");

  // Never show fallback/IGDB covers in edit - same as when no cover present
  const coverUrlWithTimestamp = useMemo(() => {
    if (!item?.cover || item.cover.trim() === "") return "";
    const baseUrl = item.cover.split("?")[0].split("&")[0];
    if (baseUrl.startsWith("http")) return "";
    const url = buildApiUrl(API_BASE, baseUrl);
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${imageTimestamp}`;
  }, [item?.cover, imageTimestamp]);

  const backgroundUrlWithTimestamp = useMemo(() => {
    if (!item?.background || item.background.trim() === "") return "";
    const baseUrl = item.background.split("?")[0].split("&")[0];
    if (baseUrl.startsWith("http")) {
      return `${baseUrl}?t=${imageTimestamp}`;
    }
    const url = buildApiUrl(API_BASE, baseUrl);
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${imageTimestamp}`;
  }, [item?.background, imageTimestamp]);

  /** Cover preview in modal: local file + upload preview only (never external URLs). */
  const coverLocalPreviewUrl = useMemo(() => {
    if (coverRemoved) return "";
    if (coverPreview) return coverPreview;
    return coverUrlWithTimestamp;
  }, [coverRemoved, coverPreview, coverUrlWithTimestamp]);

  useEffect(() => {
    if (isOpen && item) {
      setTitle(item.title || "");
      setSummary(item.summary || "");
      setShowTitleInPreview((item as any).showTitle !== false);
      setLocalExternalCover(initialExternalCoverUrl(item));
      setLocalExternalBackground(initialExternalBackgroundUrl(item));
      setError(null);
      setActiveTab("INFO");
      setCoverPreview(null);
      setBackgroundPreview(null);
      setCoverFile(null);
      setBackgroundFile(null);
      setCoverRemoved(false);
      setBackgroundRemoved(false);
      setImageTimestamp(Date.now());
    } else if (!isOpen) {
      setCoverPreview(null);
      setBackgroundPreview(null);
      setCoverFile(null);
      setBackgroundFile(null);
    }
  }, [isOpen, item]);

  useEffect(() => {
    if (item) {
      const hasCoverOrExternal =
        !!(item.cover && item.cover.trim()) || !!item.externalCoverUrl?.trim();
      if (!hasCoverOrExternal && !coverRemoved && !coverFile) {
        setCoverRemoved(true);
        setCoverPreview(null);
        setImageTimestamp(Date.now());
      }
      if (hasBackground && !item.background && !backgroundRemoved && !backgroundFile) {
        setBackgroundRemoved(true);
        setBackgroundPreview(null);
        setImageTimestamp(Date.now());
      }
    }
  }, [item?.cover, item?.background, hasBackground]);

  useEffect(() => {
    if (!isOpen) return;
    function handleEscKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", handleEscKey, true);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscKey, true);
      // Restore body overflow after a tick so parent can restore scroll position first
      setTimeout(() => {
        document.body.style.overflow = "";
      }, 0);
    };
  }, [isOpen, onClose]);

  const hasChanges = () => {
    return (
      title.trim() !== item.title.trim() ||
      summary.trim() !== (item.summary || "").trim() ||
      (hasShowTitle && showTitleInPreview !== ((item as any).showTitle !== false)) ||
      normExt(localExternalCover) !== normExt(initialExternalCoverUrl(item)) ||
      (hasBackground &&
        normExt(localExternalBackground) !== normExt(initialExternalBackgroundUrl(item))) ||
      coverFile !== null ||
      (hasBackground && backgroundFile !== null) ||
      coverRemoved ||
      (hasBackground && backgroundRemoved)
    );
  };

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("gameDetail.invalidImageType", "File must be an image"));
      return;
    }
    void (async () => {
      try {
        const out = await normalizeGameCoverImage(file);
        const reader = new FileReader();
        reader.onloadend = () => setCoverPreview(reader.result as string);
        reader.readAsDataURL(out);
        setCoverFile(out);
        setCoverRemoved(false);
        setError(null);
      } catch {
        setError(
          t("gameDetail.imageProcessFailed", "Could not process the image. Try another format (e.g. JPEG or PNG).")
        );
      }
    })();
  };

  const handleBackgroundFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("gameDetail.invalidImageType", "File must be an image"));
      return;
    }
    void (async () => {
      try {
        const out = await normalizeWideImage(file);
        const reader = new FileReader();
        reader.onloadend = () => setBackgroundPreview(reader.result as string);
        reader.readAsDataURL(out);
        setBackgroundFile(out);
        setBackgroundRemoved(false);
        setError(null);
      } catch {
        setError(
          t("gameDetail.imageProcessFailed", "Could not process the image. Try another format (e.g. JPEG or PNG).")
        );
      }
    })();
  };

  const handleCoverRemoveSuccess = () => {
    setCoverRemoved(true);
    setCoverPreview(null);
    setCoverFile(null);
    setImageTimestamp(Date.now());
  };

  const handleBackgroundRemoveSuccess = () => {
    setBackgroundRemoved(true);
    setBackgroundPreview(null);
    setBackgroundFile(null);
    setImageTimestamp(Date.now());
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setLoading(true);

    try {
      let updatedCover: string | null = null;
      let updatedBackground: string | null = null;
      const basePath = `/${config.routeBase}/${item.id}`;

      if (coverRemoved) {
        const url = buildApiUrl(API_BASE, `${basePath}/delete-cover`);
        const res = await fetch(url, {
          method: "DELETE",
          headers: { "X-Auth-Token": getApiToken() || "" },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Failed to remove cover" }));
          throw new Error(data.error || "Failed to remove cover");
        }
        const result = await res.json();
        const data = result[config.responseKey];
        if (data?.cover) updatedCover = data.cover;
      }

      if (hasBackground && backgroundRemoved) {
        const url = buildApiUrl(API_BASE, `${basePath}/delete-background`);
        const res = await fetch(url, {
          method: "DELETE",
          headers: { "X-Auth-Token": getApiToken() || "" },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: "Failed to remove background" }));
          throw new Error(data.error || "Failed to remove background");
        }
        const result = await res.json();
        const data = result[config.responseKey];
        if (data?.background) updatedBackground = data.background;
      }

      if (coverFile) {
        setUploadingCover(true);
        try {
          const formData = new FormData();
          formData.append("file", coverFile);
          const url = buildApiUrl(API_BASE, `${basePath}/upload-cover`);
          const res = await fetch(url, {
            method: "POST",
            headers: { "X-Auth-Token": getApiToken() || "" },
            body: formData,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({ error: "Failed to upload cover" }));
            throw new Error(data.error || "Failed to upload cover");
          }
          const result = await res.json();
          const data = result[config.responseKey];
          if (data?.cover) updatedCover = data.cover;
          if (hasBackground && data?.background && !updatedBackground) updatedBackground = data.background;
        } finally {
          setUploadingCover(false);
        }
      }

      if (hasBackground && backgroundFile) {
        setUploadingBackground(true);
        try {
          const formData = new FormData();
          formData.append("file", backgroundFile);
          const url = buildApiUrl(API_BASE, `${basePath}/upload-background`);
          const res = await fetch(url, {
            method: "POST",
            headers: { "X-Auth-Token": getApiToken() || "" },
            body: formData,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({ error: "Failed to upload background" }));
            throw new Error(data.error || "Failed to upload background");
          }
          const result = await res.json();
          const data = result[config.responseKey];
          if (data?.background) updatedBackground = data.background;
          // Do not set updatedCover from background response: cover and background are separate
        } finally {
          setUploadingBackground(false);
        }
      }

      const updates: Record<string, unknown> = {};
      if (title.trim() !== item.title.trim()) updates.title = title.trim();
      if (summary.trim() !== (item.summary || "").trim()) updates.summary = summary.trim();
      if (hasShowTitle && showTitleInPreview !== ((item as any).showTitle !== false)) {
        updates.showTitle = showTitleInPreview;
      }
      if (normExt(localExternalCover) !== normExt(initialExternalCoverUrl(item))) {
        updates.externalCoverUrl = localExternalCover.trim() ? localExternalCover.trim() : null;
      }
      if (
        hasBackground &&
        normExt(localExternalBackground) !== normExt(initialExternalBackgroundUrl(item))
      ) {
        updates.externalBackgroundUrl = localExternalBackground.trim()
          ? localExternalBackground.trim()
          : null;
      }

      if (Object.keys(updates).length > 0) {
        const url = buildApiUrl(API_BASE, basePath);
        const res = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-Auth-Token": API_TOKEN },
          body: JSON.stringify(updates),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to update");
        }
        const result = await res.json();
        const data = result[config.responseKey];
        // Use server response for final media state (do not use ?? so null cover clears old external URL)
        let finalCover = coverAfterSave(updatedCover, data, item.cover);
        let finalBackground = backgroundAfterSave(
          updatedBackground,
          data,
          item.background,
          hasBackground
        );
        if (updatedCover && finalCover) {
          const sep = finalCover.includes("?") ? "&" : "?";
          finalCover = `${finalCover}${sep}t=${Date.now()}`;
        }
        if (hasBackground && updatedBackground && finalBackground) {
          const sep = finalBackground.includes("?") ? "&" : "?";
          finalBackground = `${finalBackground}${sep}t=${Date.now()}`;
        }
        const updatedItem: CollectionInfo = {
          id: data?.id ?? item.id,
          title: data?.title ?? item.title,
          summary: data?.summary ?? item.summary ?? "",
          cover: finalCover,
          background: finalBackground,
          externalCoverUrl:
            data?.externalCoverUrl !== undefined
              ? data.externalCoverUrl
              : (item.externalCoverUrl ?? null),
          externalBackgroundUrl:
            data?.externalBackgroundUrl !== undefined
              ? data.externalBackgroundUrl
              : (item.externalBackgroundUrl ?? null),
          showTitle: hasShowTitle ? (data?.showTitle ?? (item as any).showTitle) : undefined,
          ...(typeof (data as any)?.gameCount === "number" ? { gameCount: (data as any).gameCount } : {}),
        };
        dispatchUpdate(updatedItem);
        onItemUpdate(updatedItem);
      } else if (coverFile || (hasBackground && backgroundFile) || coverRemoved || (hasBackground && backgroundRemoved)) {
        const url = buildApiUrl(API_BASE, basePath);
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json", "X-Auth-Token": API_TOKEN },
        });
        if (res.ok) {
          const result = await res.json();
          const data = result[config.responseKey] ?? result;
          let finalCover = coverAfterSave(updatedCover, data, item.cover);
          let finalBackground = backgroundAfterSave(
            updatedBackground,
            data,
            item.background,
            hasBackground
          );
          if ((updatedCover !== null || coverRemoved) && finalCover) {
            const sep = finalCover.includes("?") ? "&" : "?";
            finalCover = `${finalCover}${sep}t=${Date.now()}`;
          }
          if (hasBackground && (updatedBackground !== null || backgroundRemoved) && finalBackground) {
            const sep = finalBackground.includes("?") ? "&" : "?";
            finalBackground = `${finalBackground}${sep}t=${Date.now()}`;
          }
          const updatedItem: CollectionInfo = {
            id: data?.id ?? item.id,
            title: data?.title ?? item.title,
            summary: data?.summary ?? item.summary ?? "",
            cover: finalCover,
            background: finalBackground,
            externalCoverUrl:
              data?.externalCoverUrl !== undefined
                ? data.externalCoverUrl
                : (item.externalCoverUrl ?? null),
            externalBackgroundUrl:
              data?.externalBackgroundUrl !== undefined
                ? data.externalBackgroundUrl
                : (item.externalBackgroundUrl ?? null),
            showTitle: hasShowTitle ? (data?.showTitle ?? (item as any).showTitle) : undefined,
            ...(typeof (data as any)?.gameCount === "number" ? { gameCount: (data as any).gameCount } : {}),
          };
          dispatchUpdate(updatedItem);
          onItemUpdate(updatedItem);
        }
      } else {
        onClose();
        return;
      }
      onClose();
    } catch (err: unknown) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  function dispatchUpdate(updatedItem: CollectionInfo) {
    if (resourceType === "collections") {
      window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collection: updatedItem } }));
    } else if (resourceType === "developers") {
      window.dispatchEvent(new CustomEvent("developerUpdated", { detail: { developer: updatedItem } }));
    } else if (resourceType === "publishers") {
      window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: { publisher: updatedItem } }));
    }
  }

  if (!isOpen) return null;


  return createPortal(
    <div className="edit-collection-modal-overlay" onClick={onClose}>
      <div className="edit-collection-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="edit-collection-modal-header">
          <h2>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {t(config.titleKey, resourceType === "collections" ? "Edit Collection" : resourceType === "developers" ? "Edit Developer" : "Edit Publisher")}
          </h2>
          <button className="edit-collection-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="edit-collection-modal-content">
          {error && <div className="edit-collection-modal-error">{error}</div>}

          <div className="edit-collection-modal-tabs">
            <button
              className={`edit-collection-modal-tab ${activeTab === "INFO" ? "active" : ""}`}
              onClick={() => setActiveTab("INFO")}
              disabled={saving}
            >
              {t("gameDetail.info", "INFO")}
            </button>
            <button
              className={`edit-collection-modal-tab ${activeTab === "MEDIA" ? "active" : ""}`}
              onClick={() => setActiveTab("MEDIA")}
              disabled={saving}
            >
              {t("gameDetail.media", "MEDIA")}
            </button>
          </div>

          {activeTab === "INFO" && (
            <div className="edit-collection-modal-info">
              <div className="edit-collection-modal-field">
                <label htmlFor="edit-collection-like-title">
                  {resourceType === "collections" ? t("collectionDetail.title", "Title") : t("igdbInfo.name", "Name")}
                </label>
                <input
                  id="edit-collection-like-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="edit-collection-modal-field">
                <label htmlFor="edit-collection-like-summary">{t("collectionDetail.summary", "Summary")}</label>
                <textarea
                  id="edit-collection-like-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={saving}
                  rows={15}
                />
              </div>
            </div>
          )}

          {activeTab === "MEDIA" && (
            <div className="edit-collection-modal-media">
              {hasShowTitle && (
                <div className="edit-collection-modal-media-options">
                  <label className="edit-collection-modal-media-checkbox-label">
                    <input
                      type="checkbox"
                      checked={showTitleInPreview}
                      onChange={(e) => setShowTitleInPreview(e.target.checked)}
                      aria-label={t("gameDetail.showTitle", "Show title on cover")}
                    />
                    <span>{t("gameDetail.showTitle", "Show title on cover")}</span>
                  </label>
                </div>
              )}
              <div className="edit-game-modal-media-block">
                <div className="edit-collection-modal-media-row">
                  <div className="edit-collection-modal-media-info">
                    <div className="edit-collection-modal-label">{t("gameDetail.cover", "Cover")}</div>
                    <div className="edit-collection-modal-media-description">
                      {t("gameDetail.coverFormat", "Recommended format: WebP, ratio 2:3 (e.g., 400x600px)")}
                    </div>
                  </div>
                  <div className="edit-collection-modal-media-image-container">
                    {(() => {
                      const currentCoverUrl = coverRemoved ? "" : coverLocalPreviewUrl;
                      const hasCover = !!currentCoverUrl?.trim();
                      return (
                        <>
                          <Cover
                            key={`cover-${coverRemoved ? "removed" : coverPreview ? "preview" : coverLocalPreviewUrl}`}
                            title={item.title}
                            coverUrl={currentCoverUrl}
                            width={150}
                            height={200}
                            showTitle={false}
                            detail={false}
                            play={false}
                            showBorder={true}
                            aspectRatio="3/4"
                            onUpload={() => !uploadingCover && !saving && coverInputRef.current?.click()}
                            uploading={uploadingCover}
                            showRemoveButton={!!hasCover && !coverRemoved}
                            removeMediaType="cover"
                            removeResourceId={item.id}
                            removeResourceType={resourceType}
                            onCollectionUpdate={onItemUpdate}
                            onRemoveSuccess={handleCoverRemoveSuccess}
                            removeDisabled={saving || uploadingCover}
                          />
                          <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCoverFileSelect}
                            aria-label={t("gameDetail.cover", "Cover")}
                          />
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div className="edit-collection-modal-media-row edit-game-modal-external-url-row">
                  <div className="edit-collection-modal-media-info">
                    <label htmlFor="edit-collection-like-external-cover-url" className="edit-collection-modal-label">
                      {t("gameDetail.externalCoverUrl", "External cover URL")}
                    </label>
                  </div>
                  <div className="edit-game-modal-external-url-input-column">
                    <input
                      id="edit-collection-like-external-cover-url"
                      type="url"
                      className="edit-game-modal-external-url-input"
                      value={localExternalCover}
                      onChange={(e) => setLocalExternalCover(e.target.value)}
                      disabled={saving}
                      placeholder={t("gameDetail.externalCoverUrlPlaceholder", "https://… (used when no local cover)")}
                      autoComplete="off"
                    />
                    <p className="edit-game-modal-external-url-hint">
                      {t("gameDetail.externalUrlHint", "A local uploaded file takes priority over this URL.")}
                    </p>
                  </div>
                </div>
              </div>

              {hasBackground && (
                <div className="edit-game-modal-media-block">
                  <div className="edit-collection-modal-media-row edit-collection-modal-media-row--background">
                    <div className="edit-collection-modal-media-info">
                      <div className="edit-collection-modal-label">{t("gameDetail.background", "Background")}</div>
                      <div className="edit-collection-modal-media-description">
                        {t("gameDetail.backgroundFormat", "Recommended format: WebP, ratio 16:9 (e.g., 1920x1080px)")}
                      </div>
                    </div>
                    <div className="edit-collection-modal-media-image-container">
                      {(() => {
                        const currentBgUrl = backgroundRemoved ? "" : (backgroundPreview || backgroundUrlWithTimestamp);
                        const hasBg = !!currentBgUrl?.trim();
                        return (
                          <>
                            <Cover
                              key={`bg-${backgroundRemoved ? "removed" : backgroundPreview ? "preview" : backgroundUrlWithTimestamp}`}
                              title={item.title}
                              coverUrl={currentBgUrl}
                              width={300}
                              height={169}
                              showTitle={false}
                              detail={false}
                              play={false}
                              showBorder={true}
                              aspectRatio="16/9"
                              onUpload={() => !uploadingBackground && !saving && backgroundInputRef.current?.click()}
                              uploading={uploadingBackground}
                              showRemoveButton={!!hasBg && !backgroundRemoved}
                              removeMediaType="background"
                              removeResourceId={item.id}
                              removeResourceType={resourceType}
                              onCollectionUpdate={onItemUpdate}
                              onRemoveSuccess={handleBackgroundRemoveSuccess}
                              removeDisabled={saving || uploadingBackground}
                            />
                            <input
                              ref={backgroundInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleBackgroundFileSelect}
                              aria-label={t("gameDetail.background", "Background")}
                            />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="edit-collection-modal-media-row edit-game-modal-external-url-row">
                    <div className="edit-collection-modal-media-info">
                      <label htmlFor="edit-collection-like-external-background-url" className="edit-collection-modal-label">
                        {t("gameDetail.externalBackgroundUrl", "External background URL")}
                      </label>
                    </div>
                    <div className="edit-game-modal-external-url-input-column">
                      <input
                        id="edit-collection-like-external-background-url"
                        type="url"
                        className="edit-game-modal-external-url-input"
                        value={localExternalBackground}
                        onChange={(e) => setLocalExternalBackground(e.target.value)}
                        disabled={saving}
                        placeholder={t(
                          "gameDetail.externalBackgroundUrlPlaceholder",
                          "https://… (used when no local background)"
                        )}
                        autoComplete="off"
                      />
                      <p className="edit-game-modal-external-url-hint">
                        {t("gameDetail.externalUrlHint", "A local uploaded file takes priority over this URL.")}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="edit-collection-modal-footer">
          <button className="edit-collection-modal-cancel" onClick={onClose} disabled={saving}>
            {t("common.cancel", "Cancel")}
          </button>
          <button className="edit-collection-modal-save" onClick={handleSave} disabled={saving || !hasChanges()}>
            {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
