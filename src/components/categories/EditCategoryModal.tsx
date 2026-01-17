import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../config";
import { useLoading } from "../../contexts/LoadingContext";
import Cover from "../games/Cover";
import type { CategoryItem } from "../../types";
import { buildApiUrl, buildApiHeaders, buildCategoryCoverUrl } from "../../utils/api";
import "./EditCategoryModal.css";

type EditCategoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  category: CategoryItem;
  onCategoryUpdate: (updatedCategory: CategoryItem) => void;
};

export default function EditCategoryModal({
  isOpen,
  onClose,
  category,
  onCategoryUpdate,
}: EditCategoryModalProps) {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState<number>(Date.now());

  // Memoize cover URL with timestamp when modal opens
  // For categories, always use buildCategoryCoverUrl which handles remote covers (aligned with EditGameModal)
  const coverUrlWithTimestamp = useMemo(() => {
    if (!category) return "";
    // Remove any existing timestamp from the URL to get base path
    const baseCover = category.cover ? category.cover.split('?')[0].split('&')[0] : undefined;
    // Use buildCategoryCoverUrl which handles both local covers and remote /categories/$ID/cover.webp fallback
    // Always show category cover (unlike games which hide IGDB covers in edit modal)
    return buildCategoryCoverUrl(API_BASE, category.id, baseCover, true);
  }, [category?.id, category?.cover]);

  useEffect(() => {
    if (isOpen && category) {
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
  }, [isOpen, category]);

  // Update removed state when category is updated (e.g., after image removal)
  useEffect(() => {
    if (isOpen && category) {
      if ((!category.cover || category.cover.trim() === "") && !coverRemoved && !coverFile) {
        // Cover was removed externally
        setCoverRemoved(true);
        setCoverPreview(null);
        setImageTimestamp(Date.now());
      }
    }
  }, [isOpen, category?.cover]);

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
    if (!hasChanges()) {
      onClose();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, handle cover removal if marked for removal
      let updatedCover: string | null = null;

      if (coverRemoved && !coverFile) {
        try {
          const url = buildApiUrl(API_BASE, `/categories/${encodeURIComponent(category.title)}/delete-cover`);
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
          if (result.category) {
            updatedCover = result.category.cover || null;
          }
        } catch (err: any) {
          setError(String(err.message || err));
          setLoading(false);
          return;
        }
      }

      // Then, upload images if any
      if (coverFile) {
        setUploadingCover(true);
        try {
          const formData = new FormData();
          formData.append('file', coverFile);

          const coverUrl = buildApiUrl(API_BASE, `/categories/${encodeURIComponent(category.title)}/upload-cover`);
          const coverResponse = await fetch(coverUrl, {
            method: 'POST',
            headers: buildApiHeaders(),
            body: formData,
          });

          if (!coverResponse.ok) {
            const errorData = await coverResponse.json().catch(() => ({ error: 'Failed to upload cover' }));
            throw new Error(errorData.error || 'Failed to upload cover');
          }

          // Get updated cover from response
          const coverResult = await coverResponse.json();
          if (coverResult.category) {
            if (coverResult.category.cover) {
              updatedCover = coverResult.category.cover;
            }
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

      // Update category with new cover (add timestamp to force browser reload)
      if (coverFile || coverRemoved) {
        let finalCover: string | undefined = undefined;
        
        if (coverRemoved) {
          // Cover was removed, set to undefined
          finalCover = undefined;
        } else if (updatedCover !== null) {
          // Cover was uploaded, use the new cover URL
          finalCover = updatedCover;
          // Add timestamp to force browser reload
          if (finalCover) {
            const separator = finalCover.includes('?') ? '&' : '?';
            finalCover = `${finalCover}${separator}t=${Date.now()}`;
          }
        } else if (category.cover) {
          // No changes, keep existing cover but add timestamp
          const separator = category.cover.includes('?') ? '&' : '?';
          finalCover = `${category.cover}${separator}t=${Date.now()}`;
        }
        
        const updatedCategory: CategoryItem = {
          id: category.id,
          title: category.title,
          cover: finalCover,
        };
        
        // Dispatch event to update allCategories in CategoriesPage
        window.dispatchEvent(new CustomEvent("categoryUpdated", { detail: { category: updatedCategory } }));
        onCategoryUpdate(updatedCategory);
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
          <h2>{t("category.editCategory", "Edit Category")}</h2>
          <button className="edit-collection-modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="edit-collection-modal-error">
            {error}
          </div>
        )}

        <div className="edit-collection-modal-content">
          <div className="edit-collection-modal-tabs">
            <button
              className={`edit-collection-modal-tab active`}
              onClick={() => {}}
            >
              {t("gameDetail.media", "MEDIA")}
            </button>
          </div>

          <div className="edit-collection-modal-tab-content">
            <div className="edit-collection-modal-media">
              {/* Cover Section */}
              <div className="edit-collection-modal-media-row">
              <div className="edit-collection-modal-media-info">
                <div className="edit-collection-modal-label">{t("gameDetail.cover", "Cover")}</div>
                <div className="edit-collection-modal-media-description">
                  {t("category.coverFormat", "Recommended ratio: 16:9 (e.g., 1280x720px)")}
                </div>
              </div>
              <div className="edit-collection-modal-media-image-container">
                {(() => {
                  const currentCoverUrl = coverRemoved ? "" : (coverPreview || coverUrlWithTimestamp);
                  // Check if cover is local (starts with /category-covers/) not remote (/categories/)
                  const isLocalCover = category.cover && category.cover.startsWith('/category-covers/');
                  const hasCover = isLocalCover && currentCoverUrl && currentCoverUrl.trim() !== "";
                  return (
                    <>
                      <Cover
                        key={`cover-${coverRemoved ? 'removed' : coverPreview ? 'preview' : coverUrlWithTimestamp}`}
                        title={category.title}
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
                        removeResourceId={category.title}
                        removeResourceType="categories"
                        onRemoveSuccess={handleCoverRemoveSuccess}
                        removeDisabled={uploadingCover}
                      />
                      <input
                        ref={coverInputRef}
                        id="edit-category-cover-input"
                        name="cover"
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleCoverFileSelect}
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
          <button
            className="edit-collection-modal-cancel"
            onClick={onClose}
            disabled={uploadingCover}
          >
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
