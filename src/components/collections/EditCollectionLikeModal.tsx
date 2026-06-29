import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  isSidebarSearchDialogOpen,
  resolveSearchActionStackZIndex,
  wrapSidebarSearchMenuStack,
} from "../../utils/sidebarSearchMenuStack";
import { API_BASE, API_TOKEN, getApiToken } from "../../config";
import { useLoading } from "../../contexts/LoadingContext";
import Cover from "../games/Cover";
import type { CollectionInfo } from "../../types";
import { buildApiUrl } from "../../utils/api";
import { bumpCoverCache } from "../../utils/coverUrlCache";
import { normalizeGameCoverImage, normalizeWideImage } from "../../utils/imageUploadNormalize";
import EditCompanyProfileFields from "../companies/EditCompanyProfileFields";
import {
  companyProfileFormStatesEqual,
  companyProfileToFormState,
  formStateToCompanyProfile,
  type CompanyProfileFormState,
} from "../../utils/editCompanyProfile";
import {
  applyCompanyProfileFieldsToPayload,
  collectionInfoFromApi,
  fetchCollectionLikeDetail,
  mergeCompanyProfileOntoCollectionInfo,
  pickCompanyProfileFields,
} from "../../utils/companyProfile";
import { dispatchDeveloperOrPublisherUpdated } from "../../utils/companyProfileSync";
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
    titleKey: "catalogInfo.editDeveloper",
  },
  publishers: {
    routeBase: "publishers",
    responseKey: "publisher",
    coverPrefix: "publisher-covers",
    backgroundPrefix: "publisher-backgrounds",
    titleKey: "catalogInfo.editPublisher",
  },
};

type EditCollectionLikeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  resourceType: CollectionLikeResourceType;
  item: CollectionInfo;
  onItemUpdate: (updatedItem: CollectionInfo) => void;
  stackAboveSearchDropdown?: boolean;
};

export default function EditCollectionLikeModal({
  isOpen,
  onClose,
  resourceType,
  item,
  onItemUpdate,
  stackAboveSearchDropdown = false,
}: EditCollectionLikeModalProps) {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const config = RESOURCE_CONFIG[resourceType];
  const hasBackground = true;
  const hasShowTitle = true;
  const isCompanyResource = resourceType === "developers" || resourceType === "publishers";

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
  const [companyProfileForm, setCompanyProfileForm] = useState<CompanyProfileFormState>(() =>
    companyProfileToFormState(pickCompanyProfileFields(item))
  );
  const [initialCompanyProfileForm, setInitialCompanyProfileForm] = useState<CompanyProfileFormState>(() =>
    companyProfileToFormState(pickCompanyProfileFields(item))
  );
  const [resolvedItem, setResolvedItem] = useState<CollectionInfo | null>(null);
  const [resolvingItem, setResolvingItem] = useState(false);

  const activeItem = isCompanyResource ? (resolvedItem ?? item) : item;

  useEffect(() => {
    if (!isOpen || !item) {
      setResolvedItem(null);
      setResolvingItem(false);
      return;
    }
    if (!isCompanyResource) {
      setResolvedItem(null);
      setResolvingItem(false);
      return;
    }

    const controller = new AbortController();
    setResolvedItem(null);
    setResolvingItem(true);

    fetchCollectionLikeDetail(config.routeBase, item.id, controller.signal)
      .then((detail) => {
        if (controller.signal.aborted) return;
        setResolvedItem(detail ?? item);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResolvedItem(item);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setResolvingItem(false);
      });

    return () => controller.abort();
  }, [isOpen, item, isCompanyResource, config.routeBase]);

  // Never show fallback/IGDB covers in edit - same as when no cover present
  const coverUrlWithTimestamp = useMemo(() => {
    if (!activeItem?.cover || activeItem.cover.trim() === "") return "";
    const baseUrl = activeItem.cover.split("?")[0].split("&")[0];
    if (baseUrl.startsWith("http")) return "";
    const url = buildApiUrl(API_BASE, baseUrl);
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${imageTimestamp}`;
  }, [activeItem?.cover, imageTimestamp]);

  const backgroundUrlWithTimestamp = useMemo(() => {
    if (!activeItem?.background || activeItem.background.trim() === "") return "";
    const baseUrl = activeItem.background.split("?")[0].split("&")[0];
    if (baseUrl.startsWith("http")) {
      return `${baseUrl}?t=${imageTimestamp}`;
    }
    const url = buildApiUrl(API_BASE, baseUrl);
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${imageTimestamp}`;
  }, [activeItem?.background, imageTimestamp]);

  /** Cover preview in modal: local file + upload preview only (never external URLs). */
  const coverLocalPreviewUrl = useMemo(() => {
    if (coverRemoved) return "";
    if (coverPreview) return coverPreview;
    return coverUrlWithTimestamp;
  }, [coverRemoved, coverPreview, coverUrlWithTimestamp]);

  useEffect(() => {
    if (isOpen && activeItem && (!isCompanyResource || !resolvingItem)) {
      setTitle(activeItem.title || "");
      setSummary(activeItem.summary || "");
      setShowTitleInPreview((activeItem as any).showTitle !== false);
      setLocalExternalCover(initialExternalCoverUrl(activeItem));
      setLocalExternalBackground(initialExternalBackgroundUrl(activeItem));
      const nextCompanyProfileForm = companyProfileToFormState(pickCompanyProfileFields(activeItem));
      setCompanyProfileForm(nextCompanyProfileForm);
      setInitialCompanyProfileForm(nextCompanyProfileForm);
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
  }, [isOpen, activeItem, isCompanyResource, resolvingItem]);

  useEffect(() => {
    if (activeItem) {
      const hasCoverOrExternal =
        !!(activeItem.cover && activeItem.cover.trim()) || !!activeItem.externalCoverUrl?.trim();
      if (!hasCoverOrExternal && !coverRemoved && !coverFile) {
        setCoverRemoved(true);
        setCoverPreview(null);
        setImageTimestamp(Date.now());
      }
      if (hasBackground && !activeItem.background && !backgroundRemoved && !backgroundFile) {
        setBackgroundRemoved(true);
        setBackgroundPreview(null);
        setImageTimestamp(Date.now());
      }
    }
  }, [activeItem?.cover, activeItem?.background, activeItem?.externalCoverUrl, hasBackground]);

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
      title.trim() !== activeItem.title.trim() ||
      summary.trim() !== (activeItem.summary || "").trim() ||
      (hasShowTitle && showTitleInPreview !== ((activeItem as any).showTitle !== false)) ||
      normExt(localExternalCover) !== normExt(initialExternalCoverUrl(activeItem)) ||
      (hasBackground &&
        normExt(localExternalBackground) !== normExt(initialExternalBackgroundUrl(activeItem))) ||
      (isCompanyResource && !companyProfileFormStatesEqual(companyProfileForm, initialCompanyProfileForm)) ||
      coverFile !== null ||
      (hasBackground && backgroundFile !== null) ||
      coverRemoved ||
      (hasBackground && backgroundRemoved)
    );
  };

  const mergeCompanyProfileOnItem = (updatedItem: CollectionInfo, data: CollectionInfo | undefined) =>
    data ? mergeCompanyProfileOntoCollectionInfo(updatedItem, pickCompanyProfileFields(data)) : updatedItem;

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
      const basePath = `/${config.routeBase}/${activeItem.id}`;

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
      if (title.trim() !== activeItem.title.trim()) updates.title = title.trim();
      if (summary.trim() !== (activeItem.summary || "").trim()) updates.summary = summary.trim();
      if (hasShowTitle && showTitleInPreview !== ((activeItem as any).showTitle !== false)) {
        updates.showTitle = showTitleInPreview;
      }
      if (normExt(localExternalCover) !== normExt(initialExternalCoverUrl(activeItem))) {
        updates.externalCoverUrl = localExternalCover.trim() ? localExternalCover.trim() : null;
      }
      if (
        hasBackground &&
        normExt(localExternalBackground) !== normExt(initialExternalBackgroundUrl(activeItem))
      ) {
        updates.externalBackgroundUrl = localExternalBackground.trim()
          ? localExternalBackground.trim()
          : null;
      }
      if (isCompanyResource && !companyProfileFormStatesEqual(companyProfileForm, initialCompanyProfileForm)) {
        Object.assign(
          updates,
          applyCompanyProfileFieldsToPayload({}, formStateToCompanyProfile(companyProfileForm)),
        );
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
        let finalCover = coverAfterSave(updatedCover, data, activeItem.cover);
        let finalBackground = backgroundAfterSave(
          updatedBackground,
          data,
          activeItem.background,
          hasBackground
        );
        if (updatedCover && finalCover) {
          bumpCoverCache(finalCover);
          const sep = finalCover.includes("?") ? "&" : "?";
          finalCover = `${finalCover}${sep}t=${Date.now()}`;
        }
        if (hasBackground && updatedBackground && finalBackground) {
          const sep = finalBackground.includes("?") ? "&" : "?";
          finalBackground = `${finalBackground}${sep}t=${Date.now()}`;
        }
        const updatedItem: CollectionInfo = {
          ...mergeCompanyProfileOnItem(
            {
              ...collectionInfoFromApi((data ?? {}) as Record<string, unknown>),
              id: String(data?.id ?? activeItem.id),
              title: data?.title ?? activeItem.title,
              summary: data?.summary ?? activeItem.summary ?? "",
              cover: finalCover,
              background: finalBackground,
              externalCoverUrl:
                data?.externalCoverUrl !== undefined
                  ? data.externalCoverUrl
                  : (activeItem.externalCoverUrl ?? null),
              externalBackgroundUrl:
                data?.externalBackgroundUrl !== undefined
                  ? data.externalBackgroundUrl
                  : (activeItem.externalBackgroundUrl ?? null),
              showTitle: hasShowTitle ? (data?.showTitle ?? (activeItem as any).showTitle) : undefined,
              ...(typeof (data as any)?.gameCount === "number"
                ? { gameCount: (data as any).gameCount }
                : {}),
            },
            data,
          ),
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
          let finalCover = coverAfterSave(updatedCover, data, activeItem.cover);
          let finalBackground = backgroundAfterSave(
            updatedBackground,
            data,
            activeItem.background,
            hasBackground
          );
          if ((updatedCover !== null || coverRemoved) && finalCover) {
            bumpCoverCache(finalCover);
            const sep = finalCover.includes("?") ? "&" : "?";
            finalCover = `${finalCover}${sep}t=${Date.now()}`;
          }
          if (hasBackground && (updatedBackground !== null || backgroundRemoved) && finalBackground) {
            const sep = finalBackground.includes("?") ? "&" : "?";
            finalBackground = `${finalBackground}${sep}t=${Date.now()}`;
          }
          const updatedItem: CollectionInfo = mergeCompanyProfileOnItem(
            {
              ...collectionInfoFromApi((data ?? {}) as Record<string, unknown>),
              id: String(data?.id ?? activeItem.id),
              title: data?.title ?? activeItem.title,
              summary: data?.summary ?? activeItem.summary ?? "",
              cover: finalCover,
              background: finalBackground,
              externalCoverUrl:
                data?.externalCoverUrl !== undefined
                  ? data.externalCoverUrl
                  : (activeItem.externalCoverUrl ?? null),
              externalBackgroundUrl:
                data?.externalBackgroundUrl !== undefined
                  ? data.externalBackgroundUrl
                  : (activeItem.externalBackgroundUrl ?? null),
              showTitle: hasShowTitle ? (data?.showTitle ?? (activeItem as any).showTitle) : undefined,
              ...(typeof (data as any)?.gameCount === "number"
                ? { gameCount: (data as any).gameCount }
                : {}),
            },
            data,
          );
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
    } else if (resourceType === "developers" || resourceType === "publishers") {
      dispatchDeveloperOrPublisherUpdated(resourceType, updatedItem);
    }
  }

  if (!isOpen) return null;

  const mc = isCompanyResource ? "edit-game-modal" : "edit-collection-modal";

  const modalInner = (
    <>
      <div className={`${mc}-content`}>
        {error && <div className={`${mc}-error`}>{error}</div>}

        {resolvingItem ? (
          <div className={`${mc}-loading`}>{t("common.loading", "Loading...")}</div>
        ) : (
          <>
        <div className={`${mc}-tabs`}>
          <button
            type="button"
            className={`${mc}-tab ${activeTab === "INFO" ? "active" : ""}`}
            onClick={() => setActiveTab("INFO")}
            disabled={saving}
          >
            {t("gameDetail.info", "INFO")}
          </button>
          <button
            type="button"
            className={`${mc}-tab ${activeTab === "MEDIA" ? "active" : ""}`}
            onClick={() => setActiveTab("MEDIA")}
            disabled={saving}
          >
            {t("gameDetail.media", "MEDIA")}
          </button>
        </div>

        {activeTab === "INFO" && (
          isCompanyResource ? (
            <>
              <div className="edit-game-modal-field">
                <label htmlFor="edit-collection-like-title">{t("catalogInfo.name", "Name")}</label>
                <input
                  id="edit-collection-like-title"
                  name="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="edit-game-modal-field">
                <label htmlFor="edit-collection-like-summary">{t("collectionDetail.summary", "Summary")}</label>
                <textarea
                  id="edit-collection-like-summary"
                  name="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={saving}
                  rows={5}
                />
              </div>
              <EditCompanyProfileFields
                value={companyProfileForm}
                onChange={setCompanyProfileForm}
                disabled={saving}
                currentCompanyId={activeItem.id}
              />
            </>
          ) : (
            <div className="edit-collection-modal-info">
              <div className="edit-collection-modal-field">
                <label htmlFor="edit-collection-like-title">
                  {t("collectionDetail.title", "Title")}
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
          )
        )}

        {activeTab === "MEDIA" && (
          <div className={isCompanyResource ? "edit-game-modal-media" : "edit-collection-modal-media"}>
            {hasShowTitle && (
              <div
                className={
                  isCompanyResource
                    ? "edit-game-modal-media-options"
                    : "edit-collection-modal-media-options"
                }
              >
                <label
                  className={
                    isCompanyResource
                      ? "edit-game-modal-media-checkbox-label"
                      : "edit-collection-modal-media-checkbox-label"
                  }
                >
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
              <div
                className={
                  isCompanyResource ? "edit-game-modal-media-row" : "edit-collection-modal-media-row"
                }
              >
                <div
                  className={
                    isCompanyResource ? "edit-game-modal-media-info" : "edit-collection-modal-media-info"
                  }
                >
                  <div className={isCompanyResource ? "edit-game-modal-label" : "edit-collection-modal-label"}>
                    {t("gameDetail.cover", "Cover")}
                  </div>
                  <div
                    className={
                      isCompanyResource
                        ? "edit-game-modal-media-description"
                        : "edit-collection-modal-media-description"
                    }
                  >
                    {t("gameDetail.coverFormat", "Recommended format: WebP, ratio 2:3 (e.g., 400x600px)")}
                  </div>
                </div>
                <div
                  className={
                    isCompanyResource
                      ? "edit-game-modal-media-image-container"
                      : "edit-collection-modal-media-image-container"
                  }
                >
                    {(() => {
                      const currentCoverUrl = coverRemoved ? "" : coverLocalPreviewUrl;
                      const hasCover = !!currentCoverUrl?.trim();
                      return (
                        <>
                          <Cover
                            key={`cover-${coverRemoved ? "removed" : coverPreview ? "preview" : coverLocalPreviewUrl}`}
                            title={activeItem.title}
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
                            removeResourceId={activeItem.id}
                            removeResourceType={resourceType}
                            onCollectionUpdate={onItemUpdate}
                            onRemoveSuccess={handleCoverRemoveSuccess}
                            removeDisabled={saving || uploadingCover}
                          />
                          <input
                            ref={coverInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handleCoverFileSelect}
                            aria-label={t("gameDetail.cover", "Cover")}
                          />
                        </>
                      );
                    })()}
                  </div>
                </div>
              <div
                className={
                  isCompanyResource
                    ? "edit-game-modal-media-row edit-game-modal-external-url-row"
                    : "edit-collection-modal-media-row edit-game-modal-external-url-row"
                }
              >
                <div
                  className={
                    isCompanyResource ? "edit-game-modal-media-info" : "edit-collection-modal-media-info"
                  }
                >
                  <label
                    htmlFor="edit-collection-like-external-cover-url"
                    className={isCompanyResource ? "edit-game-modal-label" : "edit-collection-modal-label"}
                  >
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
                  <div
                    className={
                      isCompanyResource
                        ? "edit-game-modal-media-row edit-game-modal-media-row--background"
                        : "edit-collection-modal-media-row edit-collection-modal-media-row--background"
                    }
                  >
                    <div
                      className={
                        isCompanyResource ? "edit-game-modal-media-info" : "edit-collection-modal-media-info"
                      }
                    >
                      <div
                        className={isCompanyResource ? "edit-game-modal-label" : "edit-collection-modal-label"}
                      >
                        {t("gameDetail.background", "Background")}
                      </div>
                      <div
                        className={
                          isCompanyResource
                            ? "edit-game-modal-media-description"
                            : "edit-collection-modal-media-description"
                        }
                      >
                        {t("gameDetail.backgroundFormat", "Recommended format: WebP, ratio 16:9 (e.g., 1920x1080px)")}
                      </div>
                    </div>
                    <div
                      className={
                        isCompanyResource
                          ? "edit-game-modal-media-image-container"
                          : "edit-collection-modal-media-image-container"
                      }
                    >
                      {(() => {
                        const currentBgUrl = backgroundRemoved ? "" : (backgroundPreview || backgroundUrlWithTimestamp);
                        const hasBg = !!currentBgUrl?.trim();
                        return (
                          <>
                            <Cover
                              key={`bg-${backgroundRemoved ? "removed" : backgroundPreview ? "preview" : backgroundUrlWithTimestamp}`}
                              title={activeItem.title}
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
                              removeResourceId={activeItem.id}
                              removeResourceType={resourceType}
                              onCollectionUpdate={onItemUpdate}
                              onRemoveSuccess={handleBackgroundRemoveSuccess}
                              removeDisabled={saving || uploadingBackground}
                            />
                            <input
                              ref={backgroundInputRef}
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={handleBackgroundFileSelect}
                              aria-label={t("gameDetail.background", "Background")}
                            />
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div
                    className={
                      isCompanyResource
                        ? "edit-game-modal-media-row edit-game-modal-external-url-row"
                        : "edit-collection-modal-media-row edit-game-modal-external-url-row"
                    }
                  >
                    <div
                      className={
                        isCompanyResource ? "edit-game-modal-media-info" : "edit-collection-modal-media-info"
                      }
                    >
                      <label
                        htmlFor="edit-collection-like-external-background-url"
                        className={isCompanyResource ? "edit-game-modal-label" : "edit-collection-modal-label"}
                      >
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
          </>
        )}
      </div>

      <div className={`${mc}-footer`}>
        <button type="button" className={`${mc}-cancel`} onClick={onClose} disabled={saving}>
          {t("common.cancel", "Cancel")}
        </button>
        <button
          type="button"
          className={`${mc}-save`}
          onClick={handleSave}
          disabled={saving || resolvingItem || !hasChanges()}
        >
          {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
        </button>
      </div>
    </>
  );

  if (!isOpen) return null;

  const useSearchActionStack =
    isSidebarSearchDialogOpen() || stackAboveSearchDropdown;

  return createPortal(
    wrapSidebarSearchMenuStack(
      <div className={`${mc}-overlay`} onClick={onClose}>
      <div className={`${mc}-container`} onClick={(e) => e.stopPropagation()}>
        <div className={`${mc}-header`}>
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
            {t(
              config.titleKey,
              resourceType === "collections"
                ? "Edit Collection"
                : resourceType === "developers"
                  ? "Edit Developer"
                  : "Edit Publisher"
            )}
          </h2>
          <button type="button" className={`${mc}-close`} onClick={onClose} aria-label="Close">
            {isCompanyResource ? (
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              "×"
            )}
          </button>
        </div>

        {isCompanyResource ? (
          <form className="edit-game-modal-form" onSubmit={(e) => e.preventDefault()}>
            {modalInner}
          </form>
        ) : (
          modalInner
        )}
      </div>
    </div>,
      useSearchActionStack,
      resolveSearchActionStackZIndex(),
    ),
    document.body
  );
}
