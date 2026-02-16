import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { API_BASE, API_TOKEN, getApiToken } from "../../config";
import { useLoading } from "../../contexts/LoadingContext";
import { useCategories } from "../../contexts/CategoriesContext";
import { useTagLists } from "../../contexts/TagListsContext";
import { EditGameInfoTab, EditGameMediaTab, EditGameTagsTab } from "./edit";
import type { GameItem } from "../../types";
import { buildApiUrl } from "../../utils/api";
import { toTagTitles as toTagTitlesUtil } from "../filters/tagFilterUtils";
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
  const { categories } = useCategories();
  const { tagLabels, refreshTagLists } = useTagLists();
  const [title, setTitle] = useState(game.title);
  const [summary, setSummary] = useState(game.summary || "");
  const [year, setYear] = useState(game.year?.toString() || "");
  const [month, setMonth] = useState(game.month?.toString() || "");
  const [day, setDay] = useState(game.day?.toString() || "");
  const idsToTitles = (ids: unknown, map: Map<string, string>) =>
    (Array.isArray(ids) ? ids : ids != null ? [ids] : []).map((x) =>
      typeof x === "number" ? (map.get(String(x)) ?? String(x)) : typeof x === "object" && x != null && "id" in x ? (map.get(String((x as { id: number }).id)) ?? String((x as { id: number }).id)) : String(x)
    );
  const idsToIdName = (ids: unknown, map: Map<string, string>) =>
    (Array.isArray(ids) ? ids : ids != null ? [ids] : []).map((x) => {
      const id = typeof x === "number" ? x : typeof x === "object" && x != null && "id" in x ? Number((x as { id: number }).id) : null;
      if (id == null || Number.isNaN(id)) return null;
      return { id, name: map.get(String(id)) ?? String(id) };
    }).filter((x): x is { id: number; name: string } => x != null);
  const genreIdsToTitles = (ids: unknown) =>
    (Array.isArray(ids) ? ids : ids != null ? [ids] : []).map((x) => {
      const id = typeof x === "number" ? x : typeof x === "object" && x != null && "id" in x ? Number((x as { id: number }).id) : null;
      if (id == null) return String(x);
      const c = categories.find((cat) => String(cat.id) === String(id));
      return c?.title ?? String(id);
    });

  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedGameModes, setSelectedGameModes] = useState<string[]>([]);
  const [selectedPlayerPerspectives, setSelectedPlayerPerspectives] = useState<string[]>([]);
  const [selectedGameEngines, setSelectedGameEngines] = useState<string[]>([]);
  const [selectedFranchise, setSelectedFranchise] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedSeries, setSelectedSeries] = useState<Array<{ id: number; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"INFO" | "TAGS" | "MEDIA">("INFO");
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [backgroundRemoved, setBackgroundRemoved] = useState(false);
  const [imageTimestamp, setImageTimestamp] = useState<number>(Date.now());
  const [showTitle, setShowTitle] = useState(true);

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
      setSelectedGenres(genreIdsToTitles(game.genre));
      setSelectedThemes(idsToTitles(game.themes, tagLabels.themes));
      setSelectedKeywords(Array.isArray(game.keywords) ? game.keywords : []);
      setSelectedPlatforms(idsToTitles(game.platforms, tagLabels.platforms));
      setSelectedGameModes(idsToTitles(game.gameModes, tagLabels.gameModes));
      setSelectedPlayerPerspectives(idsToTitles(game.playerPerspectives, tagLabels.playerPerspectives));
      setSelectedGameEngines(idsToTitles(game.gameEngines, tagLabels.gameEngines));
      setSelectedFranchise(idsToIdName(game.franchise, tagLabels.franchises));
      setSelectedSeries(idsToIdName(game.series ?? game.collection, tagLabels.series));
      setError(null);
      setActiveTab("INFO");
      setCoverPreview(null);
      setBackgroundPreview(null);
      setCoverFile(null);
      setBackgroundFile(null);
      setCoverRemoved(false);
      setBackgroundRemoved(false);
      setShowTitle(game.showTitle !== false);
      // Generate new timestamp to force image reload when modal opens
      setImageTimestamp(Date.now());
    }
  }, [isOpen, game, tagLabels, categories]);

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

  const areTagsEqual = (left: string[], right: string[]) => {
    if (left.length !== right.length) return false;
    const sortedLeft = [...left].sort();
    const sortedRight = [...right].sort();
    return sortedLeft.every((tag, index) => tag === sortedRight[index]);
  };

  const normalizeTagArray = (tags?: string[] | null) => (Array.isArray(tags) ? tags : []);

  // Check if there are any changes
  const hasChanges = () => {
    if (title !== game.title) return true;
    if (summary !== (game.summary || "")) return true;
    if (year !== (game.year?.toString() || "")) return true;
    if (month !== (game.month?.toString() || "")) return true;
    if (day !== (game.day?.toString() || "")) return true;
    if (showTitle !== (game.showTitle !== false)) return true;

    const currentGenre = genreIdsToTitles(game.genre);
    if (!areTagsEqual(selectedGenres, currentGenre)) {
      return true;
    }
    if (!areTagsEqual(selectedThemes, idsToTitles(game.themes, tagLabels.themes))) return true;
    if (!areTagsEqual(selectedKeywords, normalizeTagArray(game.keywords))) return true;
    if (!areTagsEqual(selectedPlatforms, idsToTitles(game.platforms, tagLabels.platforms))) return true;
    if (!areTagsEqual(selectedGameModes, idsToTitles(game.gameModes, tagLabels.gameModes))) return true;
    if (!areTagsEqual(selectedPlayerPerspectives, idsToTitles(game.playerPerspectives, tagLabels.playerPerspectives))) return true;
    if (!areTagsEqual(selectedGameEngines, idsToTitles(game.gameEngines, tagLabels.gameEngines))) return true;
    const currentFranchise = idsToIdName(game.franchise, tagLabels.franchises);
    const currentSeries = idsToIdName(game.series ?? game.collection, tagLabels.series);
    if (
      selectedFranchise.length !== currentFranchise.length ||
      selectedFranchise.some((f, i) => currentFranchise[i]?.id !== f.id || currentFranchise[i]?.name !== f.name)
    )
      return true;
    if (
      selectedSeries.length !== currentSeries.length ||
      selectedSeries.some((s, i) => currentSeries[i]?.id !== s.id || currentSeries[i]?.name !== s.name)
    )
      return true;

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
      const currentGenre = genreIdsToTitles(game.genre);
      if (!areTagsEqual(selectedGenres, currentGenre)) {
        updates.genre = selectedGenres.length === 1 ? selectedGenres[0] : selectedGenres;
      }
      if (!areTagsEqual(selectedThemes, idsToTitles(game.themes, tagLabels.themes))) {
        updates.themes = selectedThemes.length > 0 ? selectedThemes : [];
      }
      if (!areTagsEqual(selectedKeywords, normalizeTagArray(game.keywords))) {
        updates.keywords = selectedKeywords.length > 0 ? selectedKeywords : [];
      }
      if (!areTagsEqual(selectedPlatforms, idsToTitles(game.platforms, tagLabels.platforms))) {
        updates.platforms = selectedPlatforms.length > 0 ? selectedPlatforms : [];
      }
      if (!areTagsEqual(selectedGameModes, idsToTitles(game.gameModes, tagLabels.gameModes))) {
        updates.gameModes = selectedGameModes.length > 0 ? selectedGameModes : [];
      }
      if (!areTagsEqual(selectedPlayerPerspectives, idsToTitles(game.playerPerspectives, tagLabels.playerPerspectives))) {
        updates.playerPerspectives = selectedPlayerPerspectives.length > 0 ? selectedPlayerPerspectives : [];
      }
      if (!areTagsEqual(selectedGameEngines, idsToTitles(game.gameEngines, tagLabels.gameEngines))) {
        updates.gameEngines = selectedGameEngines.length > 0 ? selectedGameEngines : [];
      }
      const currentFranchise = idsToIdName(game.franchise, tagLabels.franchises);
      if (
        selectedFranchise.length !== currentFranchise.length ||
        selectedFranchise.some((f, i) => currentFranchise[i]?.id !== f.id)
      ) {
        updates.franchise = selectedFranchise.length > 0 ? selectedFranchise : null;
      }
      const currentSeries = idsToIdName(game.series ?? game.collection, tagLabels.series);
      if (
        selectedSeries.length !== currentSeries.length ||
        selectedSeries.some((s, i) => currentSeries[i]?.id !== s.id)
      ) {
        updates.collection = selectedSeries.length > 0 ? selectedSeries : null;
      }
      if (showTitle !== (game.showTitle !== false)) {
        updates.showTitle = showTitle;
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
        // Refresh tag lists so new tags created on save have names in GameInfoBlock
        await refreshTagLists();
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
          executables: result.game.executables || null,
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
          series: result.game.series ?? result.game.collection ?? game.series ?? game.collection ?? null,
          screenshots: result.game.screenshots ?? game.screenshots ?? null,
          videos: result.game.videos ?? game.videos ?? null,
          gameEngines: result.game.gameEngines ?? game.gameEngines ?? null,
          keywords: result.game.keywords ?? game.keywords ?? null,
          alternativeNames: result.game.alternativeNames ?? game.alternativeNames ?? null,
          similarGames: result.game.similarGames ?? game.similarGames ?? null,
          showTitle: result.game.showTitle ?? game.showTitle,
        };

        // Check if any genres were removed and delete unused categories
        if (updates.genre !== undefined) {
          const oldGenres = toTagTitlesUtil(
            Array.isArray(game.genre) ? game.genre : game.genre ? [game.genre as { id: number; title: string } | string] : []
          );
          const newGenres = toTagTitlesUtil(
            Array.isArray(updatedGame.genre) ? updatedGame.genre : updatedGame.genre ? [updatedGame.genre as { id: number; title: string } | string] : []
          );
          const removedGenres = oldGenres.filter((g) => !newGenres.includes(g));
          
          // Try to delete each removed genre if it's not used by other games
          // Note: This is a best-effort cleanup. If a category is still in use (409),
          // that's expected and not an error - we just skip deletion silently.
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
                // Category was deleted successfully - only log in debug mode
                if (import.meta.env.MODE === 'development') {
                  console.debug(`Category "${removedGenre}" was deleted as it's no longer in use`);
                }
              } else if (deleteRes.status === 409) {
                // Category is still in use - this is expected and normal behavior
                // Silently consume the response body to avoid unhandled promise rejection
                await deleteRes.json().catch(() => {});
                // No logging - this is expected behavior, not an error
              } else {
                // Other error status - only log in development
                if (import.meta.env.MODE === 'development') {
                  const errorData = await deleteRes.json().catch(() => ({}));
                  console.debug(`Category "${removedGenre}" could not be deleted: HTTP ${deleteRes.status}`, errorData);
                } else {
                  // Consume response body in production to avoid unhandled promise rejection
                  await deleteRes.json().catch(() => {});
                }
              }
            } catch (err: any) {
              // Network or other errors - silently fail - category removal is not critical
              // Only log in development mode
              if (import.meta.env.MODE === 'development' && (err.name !== 'TypeError' || !err.message.includes('fetch'))) {
                console.debug(`Error deleting category "${removedGenre}":`, err);
              }
            }
          }
        }

        onGameUpdate(updatedGame);
      } else if (coverFile || backgroundFile || coverRemoved || backgroundRemoved) {
        // If only images were uploaded or removed, update the game with the new cover/background
        // When removed, use undefined; otherwise use response or existing value
        let finalCover = coverRemoved ? undefined : (updatedCover !== null && updatedCover !== undefined ? updatedCover : game.cover);
        let finalBackground = backgroundRemoved ? undefined : (updatedBackground !== null && updatedBackground !== undefined ? updatedBackground : game.background);
        
        // If we don't have the values from upload/delete response, fetch from server (only for uploads)
        if ((coverFile && (!finalCover || finalCover === '')) || (backgroundFile && (!finalBackground || finalBackground === ''))) {
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
              className={`edit-game-modal-tab ${activeTab === "TAGS" ? "active" : ""}`}
              onClick={() => setActiveTab("TAGS")}
              disabled={saving}
            >
              {t("gameDetail.tags", "TAGS")}
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
            <EditGameInfoTab
              t={t}
              title={title}
              summary={summary}
              year={year}
              month={month}
              day={day}
              saving={saving}
              setTitle={setTitle}
              setSummary={setSummary}
              setYear={setYear}
              setMonth={setMonth}
              setDay={setDay}
            />
          )}

          {/* TAGS Tab */}
          {activeTab === "TAGS" && (
            <EditGameTagsTab
              t={t}
              isOpen={isOpen}
              gameId={game.id}
              selectedGenres={selectedGenres}
              selectedThemes={selectedThemes}
              selectedKeywords={selectedKeywords}
              selectedPlatforms={selectedPlatforms}
              selectedGameModes={selectedGameModes}
              selectedPlayerPerspectives={selectedPlayerPerspectives}
              selectedGameEngines={selectedGameEngines}
              selectedFranchise={selectedFranchise}
              selectedSeries={selectedSeries}
              saving={saving}
              setSelectedGenres={setSelectedGenres}
              setSelectedThemes={setSelectedThemes}
              setSelectedKeywords={setSelectedKeywords}
              setSelectedPlatforms={setSelectedPlatforms}
              setSelectedGameModes={setSelectedGameModes}
              setSelectedPlayerPerspectives={setSelectedPlayerPerspectives}
              setSelectedGameEngines={setSelectedGameEngines}
              setSelectedFranchise={setSelectedFranchise}
              setSelectedSeries={setSelectedSeries}
            />
          )}

          {/* MEDIA Tab */}
          {activeTab === "MEDIA" && (
            <EditGameMediaTab
              t={t}
              game={game}
              saving={saving}
              showTitle={showTitle}
              onShowTitleChange={setShowTitle}
              coverRemoved={coverRemoved}
              coverPreview={coverPreview}
              coverUrlWithTimestamp={coverUrlWithTimestamp}
              uploadingCover={uploadingCover}
              coverInputRef={coverInputRef}
              handleCoverFileSelect={handleCoverFileSelect}
              onGameUpdate={onGameUpdate}
              handleCoverRemoveSuccess={handleCoverRemoveSuccess}
              backgroundRemoved={backgroundRemoved}
              backgroundPreview={backgroundPreview}
              backgroundUrlWithTimestamp={backgroundUrlWithTimestamp}
              uploadingBackground={uploadingBackground}
              backgroundInputRef={backgroundInputRef}
              handleBackgroundFileSelect={handleBackgroundFileSelect}
              handleBackgroundRemoveSuccess={handleBackgroundRemoveSuccess}
            />
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

