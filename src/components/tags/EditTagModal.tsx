import { useState, useEffect, useMemo, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../config";
import { useLoading } from "../../contexts/LoadingContext";
import Cover from "../games/Cover";
import type { CategoryItem } from "../../types";
import { buildApiUrl, buildApiHeaders } from "../../utils/api";
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
  localCoverPrefix: string;
  removeResourceType:
    | "games"
    | "collections"
    | "categories"
    | "themes"
    | "platforms"
    | "game-engines"
    | "game-modes"
    | "player-perspectives";
  updateEventName?: string;
  updateEventPayloadKey?: string;
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
  localCoverPrefix,
  removeResourceType,
  updateEventName,
  updateEventPayloadKey,
}: EditTagModalProps) {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const coverInputId = useId();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState<number>(Date.now());

  const normalizedRouteBase = useMemo(() => {
    if (routeBase.startsWith("/")) return routeBase;
    return `/${routeBase}`;
  }, [routeBase]);

  const isLocalCoverPath = useMemo(() => {
    return (coverPath: string) => coverPath.startsWith(localCoverPrefix);
  }, [localCoverPrefix]);

  // Memoize cover URL with timestamp when modal opens
  // NEVER show remote covers in edit modal - only show local covers (aligned with EditGameModal)
  const coverUrlWithTimestamp = useMemo(() => {
    if (!item?.cover) return "";
    const baseCover = item.cover.split("?")[0].split("&")[0];
    if (!isLocalCoverPath(baseCover)) {
      return "";
    }
    const url = buildApiUrl(API_BASE, baseCover);
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}t=${imageTimestamp}`;
  }, [item?.cover, imageTimestamp, isLocalCoverPath]);

  useEffect(() => {
    if (isOpen && item) {
      setError(null);
      setCoverPreview(null);
      setCoverFile(null);
      setCoverRemoved(false);
      setImageTimestamp(Date.now());
    } else if (!isOpen) {
      setCoverPreview(null);
      setCoverFile(null);
    }
  }, [isOpen, item]);

  // Update removed state when item is updated (e.g., after image removal)
  useEffect(() => {
    if (isOpen && item) {
      if ((!item.cover || item.cover.trim() === "") && !coverRemoved && !coverFile) {
        setCoverRemoved(true);
        setCoverPreview(null);
        setImageTimestamp(Date.now());
      }
    }
  }, [isOpen, item?.cover, coverFile, coverRemoved]);

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
    return coverFile !== null || coverRemoved;
  };

  const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        setError(t("gameDetail.invalidImageType", "File must be an image"));
        e.target.value = "";
        return;
      }
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
    if (!hasChanges()) {
      onClose();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let updatedCover: string | null = null;

      if (coverRemoved && !coverFile) {
        try {
          const url = buildApiUrl(
            API_BASE,
            `${normalizedRouteBase}/${encodeURIComponent(item.title)}/delete-cover`
          );
          const response = await fetch(url, {
            method: "DELETE",
            headers: {
              "X-Auth-Token": getApiToken() || "",
            },
          });
          if (!response.ok) {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Failed to remove cover" }));
            throw new Error(errorData.error || "Failed to remove cover");
          }
          const result = await response.json();
          const updatedItem = result?.[responseKey];
          if (updatedItem) {
            updatedCover = updatedItem.cover || null;
          }
        } catch (err: any) {
          setError(String(err.message || err));
          setLoading(false);
          return;
        }
      }

      if (coverFile) {
        setUploadingCover(true);
        try {
          const formData = new FormData();
          formData.append("file", coverFile);

          const coverUrl = buildApiUrl(
            API_BASE,
            `${normalizedRouteBase}/${encodeURIComponent(item.title)}/upload-cover`
          );
          const coverResponse = await fetch(coverUrl, {
            method: "POST",
            headers: buildApiHeaders(),
            body: formData,
          });

          if (!coverResponse.ok) {
            const errorData = await coverResponse
              .json()
              .catch(() => ({ error: "Failed to upload cover" }));
            throw new Error(errorData.error || "Failed to upload cover");
          }

          const coverResult = await coverResponse.json();
          const updatedItem = coverResult?.[responseKey];
          if (updatedItem?.cover) {
            updatedCover = updatedItem.cover;
          }
        } catch (err: any) {
          setUploadingCover(false);
          setLoading(false);
          setError(String(err.message || err));
          return;
        } finally {
          setUploadingCover(false);
        }
      }

      if (coverFile || coverRemoved) {
        let finalCover: string | undefined = undefined;

        if (coverRemoved) {
          finalCover = undefined;
        } else if (updatedCover !== null) {
          finalCover = updatedCover;
          if (finalCover) {
            const separator = finalCover.includes("?") ? "&" : "?";
            finalCover = `${finalCover}${separator}t=${Date.now()}`;
          }
        } else if (item.cover) {
          const separator = item.cover.includes("?") ? "&" : "?";
          finalCover = `${item.cover}${separator}t=${Date.now()}`;
        }

        const updatedItem: CategoryItem = {
          id: item.id,
          title: item.title,
          cover: finalCover,
        };

        if (updateEventName) {
          const payloadKey = updateEventPayloadKey || "item";
          window.dispatchEvent(
            new CustomEvent(updateEventName, { detail: { [payloadKey]: updatedItem } })
          );
        }
        onItemUpdate(updatedItem);
      }

      onClose();
    } catch (err: any) {
      setError(String(err.message || err));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="edit-collection-modal-overlay" onClick={onClose}>
      <div className="edit-collection-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="edit-collection-modal-header">
          <h2>{title}</h2>
          <button className="edit-collection-modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && <div className="edit-collection-modal-error">{error}</div>}

        <div className="edit-collection-modal-content">
          <div className="edit-collection-modal-tabs">
            <button className="edit-collection-modal-tab active" onClick={() => {}}>
              {t("gameDetail.media", "MEDIA")}
            </button>
          </div>

          <div className="edit-collection-modal-tab-content">
            <div className="edit-collection-modal-media">
              <div className="edit-collection-modal-media-row">
                <div className="edit-collection-modal-media-info">
                  <div className="edit-collection-modal-label">
                    {t("gameDetail.cover", "Cover")}
                  </div>
                  <div className="edit-collection-modal-media-description">
                    {coverDescription ||
                      t("category.coverFormat", "Recommended ratio: 16:9 (e.g., 1280x720px)")}
                  </div>
                </div>
                <div className="edit-collection-modal-media-image-container">
                  {(() => {
                    const currentCoverUrl = coverRemoved ? "" : coverPreview || coverUrlWithTimestamp;
                    const isLocalCover =
                      coverPreview ||
                      coverFile ||
                      (item.cover && isLocalCoverPath(item.cover));
                    const hasCover = isLocalCover && currentCoverUrl && currentCoverUrl.trim() !== "";
                    return (
                      <>
                        <Cover
                          key={`cover-${coverRemoved ? "removed" : coverPreview ? "preview" : coverUrlWithTimestamp}`}
                          title={item.title}
                          coverUrl={currentCoverUrl}
                          width={300}
                          height={169}
                          showTitle={false}
                          detail={false}
                          play={false}
                          showBorder={true}
                          aspectRatio="16/9"
                          onUpload={() => !uploadingCover && coverInputRef.current?.click()}
                          uploading={uploadingCover}
                          showRemoveButton={!!hasCover && !coverRemoved}
                          removeMediaType="cover"
                          removeResourceId={item.title}
                          removeResourceType={removeResourceType}
                          onRemoveSuccess={handleCoverRemoveSuccess}
                          removeDisabled={uploadingCover}
                        />
                        <input
                          ref={coverInputRef}
                          id={coverInputId}
                          name="cover"
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleCoverFileSelect}
                          aria-label={coverDescription}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="edit-collection-modal-footer">
          <button className="edit-collection-modal-cancel" onClick={onClose} disabled={uploadingCover}>
            {t("common.cancel", "Cancel")}
          </button>
          <button
            className="edit-collection-modal-save"
            onClick={handleSave}
            disabled={!hasChanges() || uploadingCover}
          >
            {uploadingCover ? t("common.uploading", "Uploading...") : t("common.save", "Save")}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
