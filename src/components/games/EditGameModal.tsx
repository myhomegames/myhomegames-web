import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { API_BASE, API_TOKEN, getApiToken } from "../../config";
import { useLoading } from "../../contexts/LoadingContext";
import TagEditor from "../common/TagEditor";
import Cover from "./Cover";
import type { GameItem } from "../../types";
import { buildApiUrl } from "../../utils/api";
import "./EditGameModal.css";

type EditGameModalProps = {
  isOpen: boolean;
  onClose: () => void;
  game: GameItem;
  onGameUpdate: (updatedGame: GameItem) => void;
};

export default function EditGameModal({
  isOpen,
  onClose,
  game,
  onGameUpdate,
}: EditGameModalProps) {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [title, setTitle] = useState(game.title);
  const [summary, setSummary] = useState(game.summary || "");
  const [year, setYear] = useState(game.year?.toString() || "");
  const [month, setMonth] = useState(game.month?.toString() || "");
  const [day, setDay] = useState(game.day?.toString() || "");
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    Array.isArray(game.genre) ? game.genre : game.genre ? [game.genre] : []
  );
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

  // Memoize cover and background URLs with timestamp when modal opens
  // NEVER show IGDB images in edit modal - only show local images
  const coverUrlWithTimestamp = useMemo(() => {
    if (!game?.cover) return "";
    // Remove any existing timestamp from the URL
    const baseUrl = game.cover.split('?')[0].split('&')[0];
    // Don't show IGDB images (external URLs) in edit modal - return empty string
    if (baseUrl.startsWith("http")) {
      return "";
    }
    const url = buildApiUrl(API_BASE, baseUrl);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${imageTimestamp}`;
  }, [game?.cover, imageTimestamp]);

  const backgroundUrlWithTimestamp = useMemo(() => {
    if (!game?.background) return "";
    // Remove any existing timestamp from the URL
    const baseUrl = game.background.split('?')[0].split('&')[0];
    // Don't show IGDB images (external URLs) in edit modal - return empty string
    if (baseUrl.startsWith("http")) {
      return "";
    }
    const url = buildApiUrl(API_BASE, baseUrl);
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${imageTimestamp}`;
  }, [game?.background, imageTimestamp]);

  useEffect(() => {
    if (isOpen) {
      setTitle(game.title);
      setSummary(game.summary || "");
      setYear(game.year?.toString() || "");
      setMonth(game.month?.toString() || "");
      setDay(game.day?.toString() || "");
      setSelectedGenres(
        Array.isArray(game.genre) ? game.genre : game.genre ? [game.genre] : []
      );
      setError(null);
      setActiveTab("INFO");
      setCoverPreview(null);
      setBackgroundPreview(null);
      setCoverFile(null);
      setBackgroundFile(null);
      setCoverRemoved(false);
      setBackgroundRemoved(false);
      // Generate new timestamp to force image reload when modal opens
      setImageTimestamp(Date.now());
    }
  }, [isOpen, game]);

  // Update removed state when game is updated (e.g., after image removal)
  useEffect(() => {
    if (game) {
      if (!game.cover && !coverRemoved && !coverFile) {
        // Cover was removed externally
        setCoverRemoved(true);
        setCoverPreview(null);
        setImageTimestamp(Date.now());
      }
      if (!game.background && !backgroundRemoved && !backgroundFile) {
        // Background was removed externally
        setBackgroundRemoved(true);
        setBackgroundPreview(null);
        setImageTimestamp(Date.now());
      }
    }
  }, [game?.cover, game?.background]);

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

  // Check if there are any changes
  const hasChanges = () => {
    if (title !== game.title) return true;
    if (summary !== (game.summary || "")) return true;
    if (year !== (game.year?.toString() || "")) return true;
    if (month !== (game.month?.toString() || "")) return true;
    if (day !== (game.day?.toString() || "")) return true;

    // Check if genres changed
    const currentGenre = Array.isArray(game.genre)
      ? game.genre
      : game.genre
      ? [game.genre]
      : [];
    if (
      JSON.stringify(selectedGenres.sort()) !==
      JSON.stringify(currentGenre.sort())
    ) {
      return true;
    }

    // Check if images were selected
    if (coverFile || backgroundFile) return true;

    // Check if images were removed
    if (coverRemoved || backgroundRemoved) return true;

    return false;
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
          const url = buildApiUrl(API_BASE, `/games/${game.id}/delete-cover`);
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
          if (result.game) {
            updatedCover = result.game.cover || null;
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
          const url = buildApiUrl(API_BASE, `/games/${game.id}/delete-background`);
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
          if (result.game) {
            updatedBackground = result.game.background || null;
          }
        } catch (err: any) {
          setError(String(err.message || err));
          setSaving(false);
          setLoading(false);
          return;
        }
      }
      
      // Then, upload images if any were selected
      if (coverFile) {
        setUploadingCover(true);
        try {
          const formData = new FormData();
          formData.append('file', coverFile);

          const coverUrl = buildApiUrl(API_BASE, `/games/${game.id}/upload-cover`);
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
          if (coverResult.game) {
            // Always set updatedCover if game object exists, even if cover is null/undefined
            // The server should return the cover URL after upload
            updatedCover = coverResult.game.cover || null;
            // Also get background if it's in the response
            if (coverResult.game.background) {
              updatedBackground = coverResult.game.background;
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

          const backgroundUrl = buildApiUrl(API_BASE, `/games/${game.id}/upload-background`);
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
          if (backgroundResult.game) {
            // Always set updatedBackground if game object exists, even if background is null/undefined
            // The server should return the background URL after upload
            updatedBackground = backgroundResult.game.background || null;
            // Also get cover if it's in the response and we haven't updated it yet
            if (backgroundResult.game.cover && !updatedCover) {
              updatedCover = backgroundResult.game.cover;
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

      // Then, update other game fields
      const updates: any = {};

      if (title !== game.title) updates.title = title;
      if (summary !== (game.summary || "")) updates.summary = summary;
      if (year !== (game.year?.toString() || "")) {
        updates.year = year ? parseInt(year, 10) : null;
      }
      if (month !== (game.month?.toString() || "")) {
        updates.month = month ? parseInt(month, 10) : null;
      }
      if (day !== (game.day?.toString() || "")) {
        updates.day = day ? parseInt(day, 10) : null;
      }

      // Check if genres changed
      const currentGenre = Array.isArray(game.genre)
        ? game.genre
        : game.genre
        ? [game.genre]
        : [];
      if (
        JSON.stringify(selectedGenres.sort()) !==
        JSON.stringify(currentGenre.sort())
      ) {
        updates.genre = selectedGenres.length === 1 ? selectedGenres[0] : selectedGenres;
      }

      // Only make PUT request if there are updates (images were already uploaded)
      if (Object.keys(updates).length > 0) {
        const url = buildApiUrl(API_BASE, `/games/${game.id}`);
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
          throw new Error(errorData.error || "Failed to update game");
        }

        const result = await response.json();
        // Add timestamp to image URLs if they were updated to force browser reload
        let finalCover = updatedCover !== null ? updatedCover : result.game.cover;
        let finalBackground = updatedBackground !== null ? updatedBackground : result.game.background;
        
        if (updatedCover && finalCover) {
          const separator = finalCover.includes('?') ? '&' : '?';
          finalCover = `${finalCover}${separator}t=${Date.now()}`;
        }
        if (updatedBackground && finalBackground) {
          const separator = finalBackground.includes('?') ? '&' : '?';
          finalBackground = `${finalBackground}${separator}t=${Date.now()}`;
        }
        
        const updatedGame: GameItem = {
          id: result.game.id,
          title: result.game.title,
          summary: result.game.summary,
          cover: finalCover,
          background: finalBackground,
          day: result.game.day,
          month: result.game.month,
          year: result.game.year,
          stars: result.game.stars,
          genre: result.game.genre,
          criticratings: result.game.criticratings || null,
          userratings: result.game.userratings || null,
          command: result.game.command || null,
          // Preserve all other fields from the original game or from the result
          themes: result.game.themes ?? game.themes ?? null,
          platforms: result.game.platforms ?? game.platforms ?? null,
          gameModes: result.game.gameModes ?? game.gameModes ?? null,
          playerPerspectives: result.game.playerPerspectives ?? game.playerPerspectives ?? null,
          websites: result.game.websites ?? game.websites ?? null,
          ageRatings: result.game.ageRatings ?? game.ageRatings ?? null,
          developers: result.game.developers ?? game.developers ?? null,
          publishers: result.game.publishers ?? game.publishers ?? null,
          franchise: result.game.franchise ?? game.franchise ?? null,
          collection: result.game.collection ?? game.collection ?? null,
          screenshots: result.game.screenshots ?? game.screenshots ?? null,
          videos: result.game.videos ?? game.videos ?? null,
          gameEngines: result.game.gameEngines ?? game.gameEngines ?? null,
          keywords: result.game.keywords ?? game.keywords ?? null,
          alternativeNames: result.game.alternativeNames ?? game.alternativeNames ?? null,
          similarGames: result.game.similarGames ?? game.similarGames ?? null,
        };

        // Check if any genres were removed and delete unused categories
        if (updates.genre !== undefined) {
          const oldGenres = Array.isArray(game.genre) ? game.genre : game.genre ? [game.genre] : [];
          const newGenres = Array.isArray(updatedGame.genre) ? updatedGame.genre : updatedGame.genre ? [updatedGame.genre] : [];
          const removedGenres = oldGenres.filter((g) => !newGenres.includes(g));
          
          // Try to delete each removed genre if it's not used by other games
          for (const removedGenre of removedGenres) {
            try {
              const deleteUrl = buildApiUrl(API_BASE, `/categories/${encodeURIComponent(removedGenre)}`);
              const deleteRes = await fetch(deleteUrl, {
                method: "DELETE",
                headers: {
                  Accept: "application/json",
                  "X-Auth-Token": API_TOKEN,
                },
              });
              
              if (deleteRes.ok) {
                // Category was deleted successfully
                console.log(`Category ${removedGenre} was deleted as it's no longer in use`);
              } else if (deleteRes.status === 409) {
                // Category is still in use, that's fine
                console.log(`Category ${removedGenre} is still in use by other games`);
              }
            } catch (err: any) {
              // Silently fail - category removal is not critical
              console.warn(`Error deleting category ${removedGenre}:`, err);
            }
          }
        }

        onGameUpdate(updatedGame);
      } else if (coverFile || backgroundFile || coverRemoved || backgroundRemoved) {
        // If only images were uploaded or removed, update the game with the new cover/background
        // Use values from upload/delete response if available, otherwise fetch from server
        let finalCover = updatedCover !== null && updatedCover !== undefined ? updatedCover : game.cover;
        let finalBackground = updatedBackground !== null && updatedBackground !== undefined ? updatedBackground : game.background;
        
        // If we don't have the values from upload/delete response, fetch from server
        if ((coverFile && (!finalCover || finalCover === '')) || (backgroundFile && (!finalBackground || finalBackground === '')) || 
            (coverRemoved && finalCover === undefined) || (backgroundRemoved && finalBackground === undefined)) {
          const url = buildApiUrl(API_BASE, `/games/${game.id}`);
          const response = await fetch(url, {
            method: "GET",
            headers: {
              Accept: "application/json",
              "X-Auth-Token": API_TOKEN,
            },
          });

          if (response.ok) {
            const result = await response.json();
            if ((coverFile || coverRemoved) && finalCover === undefined) {
              finalCover = result.game.cover || null;
            }
            if ((backgroundFile || backgroundRemoved) && finalBackground === undefined) {
              finalBackground = result.game.background || null;
            }
          }
        }
        
        // Add timestamp to force browser reload if images were updated
        if ((coverFile || coverRemoved) && finalCover) {
          const separator = finalCover.includes('?') ? '&' : '?';
          finalCover = `${finalCover}${separator}t=${Date.now()}`;
        }
        if ((backgroundFile || backgroundRemoved) && finalBackground) {
          const separator = finalBackground.includes('?') ? '&' : '?';
          finalBackground = `${finalBackground}${separator}t=${Date.now()}`;
        }
        
        // Update game with new cover/background, preserving all other fields
        const updatedGame: GameItem = {
          ...game,
          cover: finalCover,
          background: finalBackground,
        };
        
        onGameUpdate(updatedGame);
      }

      // Clear previews and files
      setCoverPreview(null);
      setBackgroundPreview(null);
      setCoverFile(null);
      setBackgroundFile(null);
      setCoverRemoved(false);
      setBackgroundRemoved(false);

      onClose();
    } catch (err: any) {
      setError(String(err.message || err));
    } finally {
      setSaving(false);
      setLoading(false);
    }
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

  if (!isOpen) return null;

  return createPortal(
    <div className="edit-game-modal-overlay" onClick={onClose}>
      <div
        className="edit-game-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="edit-game-modal-header">
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
            {t("gameDetail.editGame", "Edit Game")}
          </h2>
          <button
            className="edit-game-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="edit-game-modal-content">
          {error && (
            <div className="edit-game-modal-error">{error}</div>
          )}

          {/* Tabs */}
          <div className="edit-game-modal-tabs">
            <button
              className={`edit-game-modal-tab ${activeTab === "INFO" ? "active" : ""}`}
              onClick={() => setActiveTab("INFO")}
              disabled={saving}
            >
              {t("gameDetail.info", "INFO")}
            </button>
            <button
              className={`edit-game-modal-tab ${activeTab === "MEDIA" ? "active" : ""}`}
              onClick={() => setActiveTab("MEDIA")}
              disabled={saving}
            >
              {t("gameDetail.media", "MEDIA")}
            </button>
          </div>

          {/* INFO Tab */}
          {activeTab === "INFO" && (
            <>
              <div className="edit-game-modal-field">
            <label htmlFor="edit-game-title">{t("gameDetail.title", "Title")}</label>
            <input
              id="edit-game-title"
              name="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="edit-game-modal-field">
            <label htmlFor="edit-game-summary">{t("gameDetail.summary", "Summary")}</label>
            <textarea
              id="edit-game-summary"
              name="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              disabled={saving}
              rows={5}
            />
          </div>

          <div className="edit-game-modal-row">
            <div className="edit-game-modal-field">
              <label htmlFor="edit-game-year">{t("gameDetail.year", "Year")}</label>
              <input
                id="edit-game-year"
                name="year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                disabled={saving}
                placeholder="YYYY"
              />
            </div>

            <div className="edit-game-modal-field">
              <label htmlFor="edit-game-month">{t("gameDetail.month", "Month")}</label>
              <input
                id="edit-game-month"
                name="month"
                type="number"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                disabled={saving}
                placeholder="MM"
                min="1"
                max="12"
              />
            </div>

            <div className="edit-game-modal-field">
              <label htmlFor="edit-game-day">{t("gameDetail.day", "Day")}</label>
              <input
                id="edit-game-day"
                name="day"
                type="number"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                disabled={saving}
                placeholder="DD"
                min="1"
                max="31"
              />
            </div>
          </div>

          <div className="edit-game-modal-field">
            <div className="edit-game-modal-label">{t("gameDetail.genre", "Genre")}</div>
            {isOpen && (
              <TagEditor
                key={`tag-editor-${game.id}-${isOpen}`}
                selectedTags={selectedGenres}
                onTagsChange={setSelectedGenres}
                disabled={saving}
              />
            )}
          </div>
            </>
          )}

          {/* MEDIA Tab */}
          {activeTab === "MEDIA" && (
            <div className="edit-game-modal-media">
              {/* Cover Section - First Row */}
              <div className="edit-game-modal-media-row">
                <div className="edit-game-modal-media-info">
                  <div className="edit-game-modal-label">{t("gameDetail.cover", "Cover")}</div>
                  <div className="edit-game-modal-media-description">
                    {t("gameDetail.coverFormat", "Recommended format: WebP, ratio 2:3 (e.g., 400x600px)")}
                  </div>
                </div>
                <div className="edit-game-modal-media-image-container">
                  {(() => {
                    // NEVER show IGDB images in edit modal - coverUrlWithTimestamp already filters them out
                    const currentCoverUrl = coverRemoved ? "" : (coverPreview || coverUrlWithTimestamp);
                    const hasCover = currentCoverUrl && currentCoverUrl.trim() !== "";
                    // Check if cover is from IGDB (external URL) - don't show remove button for external images
                    // Since we never show IGDB images, this is always false
                    const isCoverFromIgdb = false;
                    return (
                      <>
                        <Cover
                          key={`cover-${coverRemoved ? 'removed' : coverPreview ? 'preview' : coverUrlWithTimestamp}`}
                          title={game.title}
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
                          showRemoveButton={!!hasCover && !coverRemoved && !isCoverFromIgdb}
                          removeMediaType="cover"
                          removeResourceId={game.id}
                          removeResourceType="games"
                          onGameUpdate={onGameUpdate}
                          onRemoveSuccess={handleCoverRemoveSuccess}
                          removeDisabled={saving || uploadingCover}
                        />
                        <input
                          ref={coverInputRef}
                          id="edit-game-cover-input"
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

              {/* Background Section - Second Row */}
              <div className="edit-game-modal-media-row">
                <div className="edit-game-modal-media-info">
                  <div className="edit-game-modal-label">{t("gameDetail.background", "Background")}</div>
                  <div className="edit-game-modal-media-description">
                    {t("gameDetail.backgroundFormat", "Recommended format: WebP, ratio 16:9 (e.g., 1920x1080px)")}
                  </div>
                </div>
                <div className="edit-game-modal-media-image-container">
                  {(() => {
                    // NEVER show IGDB images in edit modal - backgroundUrlWithTimestamp already filters them out
                    const currentBackgroundUrl = backgroundRemoved ? "" : (backgroundPreview || backgroundUrlWithTimestamp);
                    const hasBackground = currentBackgroundUrl && currentBackgroundUrl.trim() !== "";
                    // Check if background is from IGDB (external URL) - don't show remove button for external images
                    // Since we never show IGDB images, this is always false
                    const isBackgroundFromIgdb = false;
                    return (
                      <>
                        <Cover
                          key={`background-${backgroundRemoved ? 'removed' : backgroundPreview ? 'preview' : backgroundUrlWithTimestamp}`}
                          title={game.title}
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
                          showRemoveButton={!!hasBackground && !backgroundRemoved && !isBackgroundFromIgdb}
                          removeMediaType="background"
                          removeResourceId={game.id}
                          removeResourceType="games"
                          onGameUpdate={onGameUpdate}
                          onRemoveSuccess={handleBackgroundRemoveSuccess}
                          removeDisabled={saving || uploadingBackground}
                        />
                        <input
                          ref={backgroundInputRef}
                          id="edit-game-background-input"
                          name="background"
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleBackgroundFileSelect}
                        />
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="edit-game-modal-footer">
          <button
            className="edit-game-modal-cancel"
            onClick={onClose}
            disabled={saving}
          >
            {t("common.cancel", "Cancel")}
          </button>
          <button
            className="edit-game-modal-save"
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

