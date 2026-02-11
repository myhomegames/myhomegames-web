import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { API_BASE, API_TOKEN, getApiToken } from "../../config";
import { useLoading } from "../../contexts/LoadingContext";
import Cover from "../games/Cover";
import type { CollectionInfo } from "../../types";
import { buildApiUrl } from "../../utils/api";
import "./EditCollectionModal.css";

type EditCollectionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  collection: CollectionInfo;
  onCollectionUpdate: (updatedCollection: CollectionInfo) => void;
};

export default function EditCollectionModal({
  isOpen,
  onClose,
  collection,
  onCollectionUpdate,
}: EditCollectionModalProps) {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [title, setTitle] = useState(collection.title);
  const [summary, setSummary] = useState(collection.summary || "");
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

  // Memoize cover and background URLs with timestamp when modal opens
  const coverUrlWithTimestamp = useMemo(() => {
    if (!collection?.cover || collection.cover.trim() === "") return "";
    // Remove any existing timestamp from the URL
    const baseUrl = collection.cover.split('?')[0].split('&')[0];
    if (baseUrl.startsWith("http")) {
      return `${baseUrl}?t=${imageTimestamp}`;
    }
    const url = buildApiUrl(API_BASE, baseUrl);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${imageTimestamp}`;
  }, [collection?.cover, imageTimestamp]);

  const backgroundUrlWithTimestamp = useMemo(() => {
    if (!collection?.background || collection.background.trim() === "") return "";
    // Remove any existing timestamp from the URL
    const baseUrl = collection.background.split('?')[0].split('&')[0];
    if (baseUrl.startsWith("http")) {
      return `${baseUrl}?t=${imageTimestamp}`;
    }
    const url = buildApiUrl(API_BASE, baseUrl);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${imageTimestamp}`;
  }, [collection?.background, imageTimestamp]);

  useEffect(() => {
    if (isOpen && collection) {
      setTitle(collection.title || "");
      setSummary(collection.summary || "");
      setShowTitleInPreview(collection.showTitle !== false);
      setError(null);
      setActiveTab("INFO");
      // Always clear previews when opening the modal to show updated images
      setCoverPreview(null);
      setBackgroundPreview(null);
      setCoverFile(null);
      setBackgroundFile(null);
      setCoverRemoved(false);
      setBackgroundRemoved(false);
      // Generate new timestamp to force image reload when modal opens
      setImageTimestamp(Date.now());
    } else if (!isOpen) {
      // Clear previews when modal closes
      setCoverPreview(null);
      setBackgroundPreview(null);
      setCoverFile(null);
      setBackgroundFile(null);
    }
  }, [isOpen, collection]);

  // Update removed state when collection is updated (e.g., after image removal)
  useEffect(() => {
    if (collection) {
      if (!collection.cover && !coverRemoved && !coverFile) {
        // Cover was removed externally
        setCoverRemoved(true);
        setCoverPreview(null);
        setImageTimestamp(Date.now());
      }
      if (!collection.background && !backgroundRemoved && !backgroundFile) {
        // Background was removed externally
        setBackgroundRemoved(true);
        setBackgroundPreview(null);
        setImageTimestamp(Date.now());
      }
    }
  }, [collection?.cover, collection?.background]);

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
      title.trim() !== collection.title.trim() ||
      summary.trim() !== (collection.summary || "").trim() ||
      showTitleInPreview !== (collection.showTitle !== false) ||
      coverFile !== null ||
      backgroundFile !== null ||
      coverRemoved ||
      backgroundRemoved
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

  const handleBackgroundFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setBackgroundPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setBackgroundFile(file);
      setBackgroundRemoved(false);
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
      // First, handle image removal if marked for removal
      let updatedCover: string | null = null;
      let updatedBackground: string | null = null;

      if (coverRemoved) {
        try {
          const url = buildApiUrl(API_BASE, `/collections/${collection.id}/delete-cover`);
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
          if (result.collection) {
            updatedCover = result.collection.cover || null;
          }
        } catch (err: any) {
          setError(String(err.message || err));
          setSaving(false);
          setLoading(false);
          return;
        }
      }

      if (backgroundRemoved) {
        try {
          const url = buildApiUrl(API_BASE, `/collections/${collection.id}/delete-background`);
          const response = await fetch(url, {
            method: 'DELETE',
            headers: {
              'X-Auth-Token': getApiToken() || '',
            },
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to remove background' }));
            throw new Error(errorData.error || 'Failed to remove background');
          }
          const result = await response.json();
          if (result.collection) {
            updatedBackground = result.collection.background || null;
          }
        } catch (err: any) {
          setError(String(err.message || err));
          setSaving(false);
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

          const coverUrl = buildApiUrl(API_BASE, `/collections/${collection.id}/upload-cover`);
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
          if (coverResult.collection) {
            if (coverResult.collection.cover) {
              updatedCover = coverResult.collection.cover;
            }
            // Also get background if it's in the response and we haven't updated it yet
            if (coverResult.collection.background && !updatedBackground) {
              updatedBackground = coverResult.collection.background;
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

      if (backgroundFile) {
        setUploadingBackground(true);
        try {
          const formData = new FormData();
          formData.append('file', backgroundFile);

          const backgroundUrl = buildApiUrl(API_BASE, `/collections/${collection.id}/upload-background`);
          const backgroundResponse = await fetch(backgroundUrl, {
            method: 'POST',
            headers: {
              'X-Auth-Token': getApiToken() || '',
            },
            body: formData,
          });

          if (!backgroundResponse.ok) {
            const errorData = await backgroundResponse.json().catch(() => ({ error: 'Failed to upload background' }));
            throw new Error(errorData.error || 'Failed to upload background');
          }

          // Get updated background from response
          const backgroundResult = await backgroundResponse.json();
          if (backgroundResult.collection) {
            if (backgroundResult.collection.background) {
              updatedBackground = backgroundResult.collection.background;
            }
            // Also get cover if it's in the response and we haven't updated it yet
            if (backgroundResult.collection.cover && !updatedCover) {
              updatedCover = backgroundResult.collection.cover;
            }
          }
        } catch (err: any) {
          setUploadingBackground(false);
          setLoading(false);
          setSaving(false);
          setError(String(err.message || err));
          return;
        } finally {
          setUploadingBackground(false);
        }
      }

      // Then, update other collection fields
      const updates: any = {};

      if (title.trim() !== collection.title.trim()) updates.title = title.trim();
      if (summary.trim() !== (collection.summary || "").trim()) updates.summary = summary.trim();
      if (showTitleInPreview !== (collection.showTitle !== false)) updates.showTitle = showTitleInPreview;

      // Only make PUT request if there are updates (images were already uploaded)
      if (Object.keys(updates).length > 0) {
        const url = buildApiUrl(API_BASE, `/collections/${collection.id}`);
        const response = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Auth-Token": API_TOKEN,
          },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update collection");
        }

        const result = await response.json();
        // Add timestamp to image URLs if they were updated to force browser reload
        let finalCover = updatedCover !== null ? updatedCover : result.collection.cover;
        let finalBackground = updatedBackground !== null ? updatedBackground : result.collection.background;
        
        if (updatedCover && finalCover) {
          const separator = finalCover.includes('?') ? '&' : '?';
          finalCover = `${finalCover}${separator}t=${Date.now()}`;
        }
        if (updatedBackground && finalBackground) {
          const separator = finalBackground.includes('?') ? '&' : '?';
          finalBackground = `${finalBackground}${separator}t=${Date.now()}`;
        }
        
        const updatedCollection: CollectionInfo = {
          id: result.collection.id,
          title: result.collection.title,
          summary: result.collection.summary,
          cover: finalCover,
          background: finalBackground,
          showTitle: result.collection.showTitle ?? collection.showTitle,
        };

        // Dispatch event to update allCollections in App.tsx
        window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collection: updatedCollection } }));
        onCollectionUpdate(updatedCollection);
      } else if (coverFile || backgroundFile || coverRemoved || backgroundRemoved) {
        // If only images were uploaded or removed, reload the collection to get updated cover/background
        const url = buildApiUrl(API_BASE, `/collections/${collection.id}`);
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "X-Auth-Token": API_TOKEN,
          },
        });

        if (response.ok) {
          const result = await response.json();
          // GET /collections/:id returns the collection directly, not wrapped in { collection: ... }
          // Use values from upload/delete response if available, otherwise use result
          let finalCover = updatedCover !== null ? updatedCover : result.cover;
          let finalBackground = updatedBackground !== null ? updatedBackground : result.background;
          
          if ((updatedCover !== null || coverRemoved) && finalCover) {
            const separator = finalCover.includes('?') ? '&' : '?';
            finalCover = `${finalCover}${separator}t=${Date.now()}`;
          }
          if ((updatedBackground !== null || backgroundRemoved) && finalBackground) {
            const separator = finalBackground.includes('?') ? '&' : '?';
            finalBackground = `${finalBackground}${separator}t=${Date.now()}`;
          }
          
          const reloadedCollection: CollectionInfo = {
            id: result.id,
            title: result.title,
            summary: result.summary || "",
            cover: finalCover,
            background: finalBackground,
            showTitle: result.showTitle ?? collection.showTitle,
          };
          // Dispatch event to update allCollections in App.tsx
          window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collection: reloadedCollection } }));
          onCollectionUpdate(reloadedCollection);
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
            {t("collectionDetail.editCollection", "Edit Collection")}
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

          {/* Tabs */}
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

          {/* INFO Tab */}
          {activeTab === "INFO" && (
            <div className="edit-collection-modal-info">
              <div className="edit-collection-modal-field">
                <label htmlFor="edit-collection-title">{t("collectionDetail.title", "Title")}</label>
                <input
                  id="edit-collection-title"
                  name="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="edit-collection-modal-field">
                <label htmlFor="edit-collection-summary">{t("collectionDetail.summary", "Summary")}</label>
                <textarea
                  id="edit-collection-summary"
                  name="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={saving}
                  rows={15}
                />
              </div>
            </div>
          )}

          {/* MEDIA Tab */}
          {activeTab === "MEDIA" && (
            <div className="edit-collection-modal-media">
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
              {/* Cover Section - First Row */}
              <div className="edit-collection-modal-media-row">
                <div className="edit-collection-modal-media-info">
                  <div className="edit-collection-modal-label">{t("gameDetail.cover", "Cover")}</div>
                  <div className="edit-collection-modal-media-description">
                    {t("gameDetail.coverFormat", "Recommended format: WebP, ratio 2:3 (e.g., 400x600px)")}
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
                          title={collection.title}
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
                          removeResourceId={collection.id}
                          removeResourceType="collections"
                          onCollectionUpdate={onCollectionUpdate}
                          onRemoveSuccess={handleCoverRemoveSuccess}
                          removeDisabled={saving || uploadingCover}
                        />
                        <input
                          ref={coverInputRef}
                          id="edit-collection-cover-input"
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

              {/* Background Section - Second Row */}
              <div className="edit-collection-modal-media-row">
                <div className="edit-collection-modal-media-info">
                  <div className="edit-collection-modal-label">{t("gameDetail.background", "Background")}</div>
                  <div className="edit-collection-modal-media-description">
                    {t("gameDetail.backgroundFormat", "Recommended format: WebP, ratio 16:9 (e.g., 1920x1080px)")}
                  </div>
                </div>
                <div className="edit-collection-modal-media-image-container">
                  {(() => {
                    const currentBackgroundUrl = backgroundRemoved ? "" : (backgroundPreview || backgroundUrlWithTimestamp);
                    const hasBackground = currentBackgroundUrl && currentBackgroundUrl.trim() !== "";
                    return (
                      <>
                        <Cover
                          key={`background-${backgroundRemoved ? 'removed' : backgroundPreview ? 'preview' : backgroundUrlWithTimestamp}`}
                          title={collection.title}
                          coverUrl={currentBackgroundUrl}
                          width={300}
                          height={169}
                          showTitle={false}
                          detail={false}
                          play={false}
                          showBorder={true}
                          aspectRatio="16/9"
                          onUpload={() => !uploadingBackground && !saving && backgroundInputRef.current?.click()}
                          uploading={uploadingBackground}
                          showRemoveButton={!!hasBackground && !backgroundRemoved}
                          removeMediaType="background"
                          removeResourceId={collection.id}
                          removeResourceType="collections"
                          onCollectionUpdate={onCollectionUpdate}
                          onRemoveSuccess={handleBackgroundRemoveSuccess}
                          removeDisabled={saving || uploadingBackground}
                        />
                        <input
                          ref={backgroundInputRef}
                          id="edit-collection-background-input"
                          name="background"
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleBackgroundFileSelect}
                          aria-label={t("gameDetail.background", "Background")}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
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

