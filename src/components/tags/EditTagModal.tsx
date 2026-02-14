import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../config";
import { useLoading } from "../../contexts/LoadingContext";
import Cover from "../games/Cover";
import type { CategoryItem } from "../../types";
import { buildApiUrl } from "../../utils/api";
import "./EditTagModal.css";

type EditTagModalProps = {
  isOpen: boolean;
  onClose: () => void;
  item: CategoryItem;
  onItemUpdate: (updatedItem: CategoryItem) => void;
  title: string;
  coverDescription?: string;
  routeBase: string;
  responseKey: string;
  /** Kept for API compatibility; fallback is filtered in useMemo like library filters IGDB */
  localCoverPrefix?: string;
  removeResourceType:
    | "games"
    | "collections"
    | "categories"
    | "themes"
    | "platforms"
    | "game-engines"
    | "game-modes"
    | "player-perspectives"
    | "series"
    | "franchise";
  /** When set, use this for API route segment instead of item.title (e.g. item.id for series/franchise) */
  getRouteSegment?: (item: CategoryItem) => string;
  /** When set, use this key to read the list from GET response (e.g. "series", "franchises") */
  listResponseKey?: string;
  updateEventName?: string;
  updateEventPayloadKey?: string;
  /** Same as list cover width (e.g. coverSize * 2 from page) so preview matches list. Default 300. */
  coverSize?: number;
  /** Optional: translate/display name for the title (same as in list). Used for preview title. */
  getDisplayName?: (value: string) => string;
};

export default function EditTagModal({
  isOpen,
  onClose,
  item,
  onItemUpdate,
  title,
  coverDescription,
  routeBase,
  responseKey,
  localCoverPrefix: _localCoverPrefix,
  removeResourceType,
  getRouteSegment,
  listResponseKey,
  updateEventName,
  updateEventPayloadKey,
  coverSize: listCoverSize = 300,
  getDisplayName,
}: EditTagModalProps) {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState<number>(Date.now());
  const [showTitle, setShowTitle] = useState(item.showTitle !== false);

  const normalizedRouteBase = routeBase.startsWith("/") ? routeBase : `/${routeBase}`;
  const routeSegment = getRouteSegment ? getRouteSegment(item) : encodeURIComponent(item.title);

  // Same as EditGameModal (library): only show local cover in edit; fallback (FRONTEND_URL) = not shown here
  const coverUrlWithTimestamp = useMemo(() => {
    if (!item?.cover || item.cover.trim() === "") return "";
    const baseUrl = item.cover.split("?")[0].split("&")[0];
    if (baseUrl.startsWith("http")) return "";
    const routeBaseNorm = routeBase.replace(/^\//, "");
    const isFallbackUrl =
      baseUrl.includes(`/${routeBaseNorm}/`) && baseUrl.endsWith("/cover.webp");
    if (isFallbackUrl) return "";
    const url = buildApiUrl(API_BASE, baseUrl);
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${imageTimestamp}`;
  }, [item?.cover, imageTimestamp, routeBase]);

  useEffect(() => {
    if (isOpen && item) {
      setShowTitle(item.showTitle !== false);
      setError(null);
      // Always clear previews when opening the modal to show updated images
      setCoverPreview(null);
      setCoverFile(null);
      setCoverRemoved(false);
      // Generate new timestamp to force image reload when modal opens
      setImageTimestamp(Date.now());
    } else if (!isOpen) {
      // Clear previews when modal closes
      setCoverPreview(null);
      setCoverFile(null);
    }
  }, [isOpen, item]);

  // Update removed state when item is updated (e.g., after image removal)
  useEffect(() => {
    if (item) {
      if (!item.cover && !coverRemoved && !coverFile) {
        // Cover was removed externally
        setCoverRemoved(true);
        setCoverPreview(null);
        setImageTimestamp(Date.now());
      }
    }
  }, [item?.cover]);

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
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const hasChanges = () => {
    return (
      showTitle !== (item.showTitle !== false) ||
      coverFile !== null ||
      coverRemoved
    );
  };

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError(t("gameDetail.invalidImageType", "File must be an image"));
        e.target.value = "";
        return;
      }
      // Create preview and store file for later upload
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setCoverFile(file);
      setCoverRemoved(false);
      setError(null);
      e.target.value = "";
    }
  };

  const handleCoverRemoveSuccess = () => {
    setCoverRemoved(true);
    setCoverPreview(null);
    setCoverFile(null);
    setImageTimestamp(Date.now());
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setLoading(true);

    try {
      // First, handle image removal if marked for removal
      let updatedCover: string | null = null;

      if (coverRemoved && item.cover) {
        try {
          const url = buildApiUrl(API_BASE, `${normalizedRouteBase}/${routeSegment}/delete-cover`);
          const response = await fetch(url, {
            method: 'DELETE',
            headers: {
              'X-Auth-Token': getApiToken() || '',
            },
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to remove cover' }));
            throw new Error(errorData.error || 'Failed to remove cover');
          }
          const result = await response.json();
          if (result[responseKey]) {
            updatedCover = result[responseKey].cover || null;
          }
        } catch (err: any) {
          setError(String(err.message || err));
          setSaving(false);
          setLoading(false);
          return;
        }
      }

      // Then, upload image if any
      if (coverFile) {
        setUploadingCover(true);
        try {
          const formData = new FormData();
          formData.append('file', coverFile);

          const coverUrl = buildApiUrl(API_BASE, `${normalizedRouteBase}/${routeSegment}/upload-cover`);
          const coverResponse = await fetch(coverUrl, {
            method: 'POST',
            headers: {
              'X-Auth-Token': getApiToken() || '',
            },
            body: formData,
          });

          if (!coverResponse.ok) {
            const errorData = await coverResponse.json().catch(() => ({ error: 'Failed to upload cover' }));
            throw new Error(errorData.error || 'Failed to upload cover');
          }

          // Get updated cover from response
          const coverResult = await coverResponse.json();
          if (coverResult[responseKey]) {
            if (coverResult[responseKey].cover) {
              updatedCover = coverResult[responseKey].cover;
            }
          }
        } catch (err: any) {
          setUploadingCover(false);
          setLoading(false);
          setSaving(false);
          setError(String(err.message || err));
          return;
        } finally {
          setUploadingCover(false);
        }
      }

      // Then, update showTitle if changed
      const updates: any = {};
      if (showTitle !== (item.showTitle !== false)) {
        updates.showTitle = showTitle;
      }

      // Only make PUT request if there are updates (images were already uploaded)
      if (Object.keys(updates).length > 0) {
        const url = buildApiUrl(API_BASE, `${normalizedRouteBase}/${routeSegment}`);
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Token": getApiToken() || '',
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update tag");
        }

        const result = await response.json();
        // Add timestamp to image URL if it was updated to force browser reload
        let finalCover = updatedCover !== null ? updatedCover : result[responseKey]?.cover || item.cover;
        
        if (updatedCover && finalCover) {
          const separator = finalCover.includes('?') ? '&' : '?';
          finalCover = `${finalCover}${separator}t=${Date.now()}`;
        }
        
        const updatedItem: CategoryItem = {
          id: result[responseKey]?.id || item.id,
          title: result[responseKey]?.title || item.title,
          cover: finalCover,
          showTitle: result[responseKey]?.showTitle ?? showTitle,
        };

        // Dispatch custom event if configured
        if (updateEventName && updateEventPayloadKey) {
          window.dispatchEvent(new CustomEvent(updateEventName, { 
            detail: { [updateEventPayloadKey]: updatedItem } 
          }));
        }

            onItemUpdate(updatedItem);
      } else if (coverFile || coverRemoved) {
        // If only image was uploaded or removed, reload the item to get updated cover
        const url = buildApiUrl(API_BASE, normalizedRouteBase);
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "X-Auth-Token": getApiToken() || '',
          },
        });

        if (response.ok) {
          const result = await response.json();
          const listKey = listResponseKey ?? (responseKey.endsWith('y') ? `${responseKey.slice(0, -1)}ies` : `${responseKey}s`);
          const items = result[listKey] || [];
          const foundItem = getRouteSegment
            ? items.find((i: CategoryItem) => String(i.id) === String(item.id))
            : items.find((i: CategoryItem) => i.title.toLowerCase() === item.title.toLowerCase());
          
          if (foundItem) {
            let finalCover = updatedCover !== null ? updatedCover : foundItem.cover;
            
            if ((updatedCover !== null || coverRemoved) && finalCover) {
              const separator = finalCover.includes('?') ? '&' : '?';
              finalCover = `${finalCover}${separator}t=${Date.now()}`;
            }
            
            const reloadedItem: CategoryItem = {
              id: foundItem.id,
              title: foundItem.title,
              cover: finalCover,
              showTitle: foundItem.showTitle ?? item.showTitle,
            };

            // Dispatch custom event if configured
            if (updateEventName && updateEventPayloadKey) {
              window.dispatchEvent(new CustomEvent(updateEventName, { 
                detail: { [updateEventPayloadKey]: reloadedItem } 
              }));
            }

            onItemUpdate(reloadedItem);
          }
        }
      } else {
        // No changes at all
        onClose();
        return;
      }

      // Clear previews and files only after closing
      // Don't clear them here to keep images visible until modal closes
      onClose();
    } catch (err: any) {
      setError(String(err.message || err));
    } finally {
      setSaving(false);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="edit-collection-modal-overlay" onClick={onClose}>
      <div
        className="edit-collection-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
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
              style={{ marginRight: "8px", verticalAlign: "middle" }}
            >
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            {title}
          </h2>
          <button
            className="edit-collection-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="edit-collection-modal-content">
          {error && (
            <div className="edit-collection-modal-error">{error}</div>
          )}

          {/* MEDIA Tab */}
          <div className="edit-collection-modal-media">
            <div className="edit-collection-modal-media-options">
              <label className="edit-collection-modal-media-checkbox-label">
                <input
                  type="checkbox"
                  checked={showTitle}
                  onChange={(e) => setShowTitle(e.target.checked)}
                  aria-label={t("gameDetail.showTitle", "Show title on cover")}
                />
                <span>{t("gameDetail.showTitle", "Show title on cover")}</span>
              </label>
            </div>
            {/* Cover Section */}
            <div className="edit-collection-modal-media-row">
              <div className="edit-collection-modal-media-info">
                <div className="edit-collection-modal-label">{t("gameDetail.cover", "Cover")}</div>
                <div className="edit-collection-modal-media-description">
                  {coverDescription || t("gameDetail.coverFormat", "Recommended format: WebP, ratio 2:3 (e.g., 400x600px)")}
                </div>
              </div>
              <div className="edit-collection-modal-media-image-container">
                {(() => {
                  const currentCoverUrl = coverRemoved ? "" : (coverPreview || coverUrlWithTimestamp);
                  const hasCover = currentCoverUrl && currentCoverUrl.trim() !== "";
                  return (
                    <>
                      <Cover
                        key={`cover-${coverRemoved ? 'removed' : coverPreview ? 'preview' : coverUrlWithTimestamp}`}
                        title={getDisplayName ? getDisplayName(item.title) : item.title}
                        coverUrl={currentCoverUrl}
                        width={Math.min(listCoverSize, 320)}
                        height={Math.min(listCoverSize, 320) * (9 / 16)}
                        showTitle={showTitle}
                        titlePosition="overlay"
                        detail={false}
                        play={false}
                        showBorder={true}
                        aspectRatio="16/9"
                        onUpload={() => !uploadingCover && !saving && coverInputRef.current?.click()}
                        uploading={uploadingCover}
                        showRemoveButton={!!hasCover && !coverRemoved}
                        removeMediaType="cover"
                        removeResourceId={getRouteSegment ? getRouteSegment(item) : item.title}
                        removeResourceType={removeResourceType}
                        onRemoveSuccess={handleCoverRemoveSuccess}
                        removeDisabled={saving || uploadingCover}
                      />
                      <input
                        ref={coverInputRef}
                        id="edit-tag-cover-input"
                        name="cover"
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleCoverFileSelect}
                        aria-label={t("gameDetail.cover", "Cover")}
                      />
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>

        <div className="edit-collection-modal-footer">
          <button
            className="edit-collection-modal-cancel"
            onClick={onClose}
            disabled={saving}
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            className="edit-collection-modal-save"
            onClick={handleSave}
            disabled={saving || !hasChanges()}
          >
            {saving ? t("common.saving", "Saving...") : t("common.save", "Save")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
