import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import Cover from "./Cover";
import StarRating from "../common/StarRating";
import Summary from "../common/Summary";
import InlineTagList from "../common/InlineTagList";
import GameInfoBlock from "./GameInfoBlock";
import MediaGallery from "./MediaGallery";
import AgeRatings, { filterAgeRatingsByLocale } from "./AgeRatings";
import EditGameModal from "./EditGameModal";
import ManageInstallationModal from "./ManageInstallationModal";
import DropdownMenu from "../common/DropdownMenu";
import AddToCollectionDropdown from "./AddToCollectionDropdown";
import AdditionalExecutablesDropdown from "./AdditionalExecutablesDropdown";
import Tooltip from "../common/Tooltip";
import BackgroundManager, { useBackground } from "../common/BackgroundManager";
import BackgroundToggle from "../ui/BackgroundToggle";
import LibrariesBar from "../layout/LibrariesBar";
import { useEditGame } from "../common/actions";
import type { GameItem, CollectionItem, CollectionInfo } from "../../types";
import { formatGameDate } from "../../utils/date";
import { displayGameType, toGameTypeId } from "../../utils/igdbGameType";
import { buildApiUrl, buildBackgroundUrl } from "../../utils/api";
import { API_BASE, getApiToken } from "../../config";
import { useSettings } from "../../contexts/SettingsContext";
import { useSkin } from "../../contexts/SkinContext";
import { useCollections } from "../../contexts/CollectionsContext";
import { useTagLists } from "../../contexts/TagListsContext";
import { useLibraryGames } from "../../contexts/LibraryGamesContext";
import type { MainAppOutletContext } from "../../layouts/MainAppLayout";
import { useSimilarGamesDetails } from "../../hooks/useSimilarGamesDetails";
import SimilarGamesList, { type SimilarGameDisplayItem } from "./SimilarGamesList";
import ScrollableGamesSection from "../common/ScrollableGamesSection";
import EditCollectionLikeModal from "../collections/EditCollectionLikeModal";
import AddCollectionLikeToCollectionLikeModal from "../collections/AddCollectionLikeToCollectionLikeModal";
import { parseCollectionLikePseudoGameId } from "../../utils/collectionLikePseudoGame";
import { buildChildCollectionLikeSlideItems, parseGamesFromJson } from "../../utils/collectionChildSlideItems";
type GameDetailProps = {
  game: GameItem;
  coverUrl: string;
  onPlay: (game: GameItem) => void;
  allCollections?: CollectionItem[];
  onRefetchGame?: () => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  onGameDelete?: (game: GameItem) => void;
};

export default function GameDetail({
  game,
  coverUrl,
  onPlay,
  allCollections = [],
  onRefetchGame,
  onGameUpdate,
  onGameDelete,
}: GameDetailProps) {
  const { t, i18n } = useTranslation();
  const [localGame, setLocalGame] = useState<GameItem>(game);
  const [isSavingRating, setIsSavingRating] = useState(false);
  const [isManageInstallationModalOpen, setIsManageInstallationModalOpen] = useState(false);
  const editGame = useEditGame();

  // Sync localGame when game prop changes
  useEffect(() => {
    setLocalGame(game);
    // If edit modal is open and game changes, update selected game
    if (editGame.isEditModalOpen && editGame.selectedGame?.id === game.id) {
      editGame.openEditModal(game);
    }
  }, [game, editGame]);
  
  const coverWidth = 256;
  const coverHeight = 384; // 256 * 1.5
  // Recalculate backgroundUrl from localGame to ensure it updates when background is removed
  const calculatedBackgroundUrl = buildBackgroundUrl(API_BASE, localGame.background, true);
  const hasBackground = Boolean(calculatedBackgroundUrl && calculatedBackgroundUrl.trim() !== "");

  // Format release date
  const releaseDate = formatGameDate(localGame, t, i18n);

  // Convert stars from 1-10 to 0-5 scale
  const rating = localGame.stars ? localGame.stars / 2 : null;

  const handleRatingChange = async (newStars: number) => {
    // Optimistic UI: update immediately, then persist in background.
    // If the request fails, revert.
    const previousGame = localGame;
    setLocalGame({ ...previousGame, stars: newStars });
    setIsSavingRating(true);
    try {
      const url = buildApiUrl(API_BASE, `/games/${previousGame.id}`);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Auth-Token': getApiToken(),
        },
        body: JSON.stringify({ stars: newStars }),
      });

      if (response.ok) {
        const updatedGame: GameItem = {
          ...previousGame,
          stars: newStars,
        };
        setLocalGame(updatedGame);
        // Dispatch event to update allGames in App.tsx
        window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
        if (onGameUpdate) {
          onGameUpdate(updatedGame);
        }
      } else {
        console.error('Failed to update rating');
        setLocalGame(previousGame);
      }
    } catch (error) {
      console.error('Error updating rating:', error);
      setLocalGame(previousGame);
    } finally {
      setIsSavingRating(false);
    }
  };

  // Get coverSize from localStorage
  const coverSize = (() => {
    const saved = localStorage.getItem("coverSize");
    return saved ? parseInt(saved, 10) : 150;
  })();

  const handleCoverSizeChange = (size: number) => {
    localStorage.setItem("coverSize", size.toString());
  };

  return (
    <BackgroundManager 
      backgroundUrl={calculatedBackgroundUrl} 
      hasBackground={hasBackground}
      elementId={game.id}
    >
      <GameDetailContent
        game={localGame}
        coverUrl={coverUrl}
        coverWidth={coverWidth}
        coverHeight={coverHeight}
        releaseDate={releaseDate}
        rating={rating}
        onPlay={onPlay}
        coverSize={coverSize}
        handleCoverSizeChange={handleCoverSizeChange}
        onRatingChange={handleRatingChange}
        isSavingRating={isSavingRating}
        editGame={editGame}
        onGameUpdate={(updatedGame) => {
          setLocalGame(updatedGame);
          // Dispatch event to update allGames in App.tsx
          window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
          if (onGameUpdate) {
            onGameUpdate(updatedGame);
          }
        }}
        onGameReload={(updatedGame) => {
          setLocalGame(updatedGame);
          // Dispatch event to update allGames in App.tsx
          window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
          if (onGameUpdate) {
            onGameUpdate(updatedGame);
          }
        }}
        onGameDelete={onGameDelete}
        allCollections={allCollections}
        onRefetchGame={onRefetchGame}
        isManageInstallationModalOpen={isManageInstallationModalOpen}
        setIsManageInstallationModalOpen={setIsManageInstallationModalOpen}
        t={t as any}
        i18n={i18n}
      />
    </BackgroundManager>
  );
}

function GameDetailContent({
  game,
  coverUrl,
  coverWidth,
  coverHeight,
  releaseDate,
  rating,
  onPlay,
  coverSize,
  handleCoverSizeChange,
  onRatingChange,
  isSavingRating,
  editGame,
  onGameUpdate,
  onGameReload,
  onGameDelete,
  allCollections,
  onRefetchGame,
  isManageInstallationModalOpen,
  setIsManageInstallationModalOpen,
  t,
  i18n,
}: {
  game: GameItem;
  coverUrl: string;
  coverWidth: number;
  coverHeight: number;
  releaseDate: string | null;
  rating: number | null;
  onPlay: (game: GameItem) => void;
  coverSize: number;
  handleCoverSizeChange: (size: number) => void;
  onRatingChange?: (newStars: number) => void;
  isSavingRating: boolean;
  editGame: ReturnType<typeof useEditGame>;
  onGameUpdate: (updatedGame: GameItem) => void;
  onGameReload: (updatedGame: GameItem) => void;
  onGameDelete?: (game: GameItem) => void;
  allCollections: CollectionItem[];
  onRefetchGame?: () => void;
  isManageInstallationModalOpen: boolean;
  setIsManageInstallationModalOpen: (open: boolean) => void;
  t: (key: string, defaultValue?: string) => string;
  i18n: { language: string };
}) {
  const navigate = useNavigate();
  const outletContext = useOutletContext<MainAppOutletContext | null>();
  const { twitchLoginEnabled } = useSettings();
  const { activeSkinWeb } = useSkin();
  const { tagLabels, tagLabelsReady } = useTagLists();
  const categoriesList = useMemo(
    () => Array.from(tagLabels.categories.entries()).map(([id, title]) => ({ id, title })),
    [tagLabels.categories]
  );
  const { hasBackground, isBackgroundVisible, setBackgroundVisible } = useBackground();
  const { getCollectionGameIds } = useCollections();
  const { games: libraryGames, updateGame } = useLibraryGames();
  const [collectionsWithSlideItems, setCollectionsWithSlideItems] = useState<
    Array<{ collection: CollectionItem; slideItems: GameItem[] }>
  >([]);
  const [editingCollectionLike, setEditingCollectionLike] = useState<CollectionInfo | null>(null);
  const [isEditCollectionLikeModalOpen, setIsEditCollectionLikeModalOpen] = useState(false);
  const [linkSourceCollectionLike, setLinkSourceCollectionLike] = useState<CollectionItem | null>(null);
  const topBarBackgroundAction: ReactNode = useMemo(() => {
    if (!activeSkinWeb.persistentLibraryShell || !hasBackground) return null;
    return (
      <Tooltip text={isBackgroundVisible ? t("common.hideBackground") : t("common.showBackground")} delay={200}>
        <div className="library-item-detail-compact-top-action">
          <BackgroundToggle isVisible={isBackgroundVisible} onChange={setBackgroundVisible} />
        </div>
      </Tooltip>
    );
  }, [activeSkinWeb.persistentLibraryShell, hasBackground, isBackgroundVisible, setBackgroundVisible, t]);

  useEffect(() => {
    outletContext?.setTopBarBeforeMainGamesActions(topBarBackgroundAction);
    return () => outletContext?.setTopBarBeforeMainGamesActions(null);
  }, [outletContext, topBarBackgroundAction]);
  
  // Helper function to format rating value (0-10 float)
  const formatRating = (value: number | null | undefined): string | null => {
    if (value === null || value === undefined || isNaN(value)) {
      return null;
    }
    const numValue = Number(value);
    if (numValue < 0 || numValue > 10) {
      return null;
    }
    // Format to show decimal only if present (e.g., 8.5 instead of 8.50, but 8 instead of 8.0)
    return numValue % 1 === 0 ? numValue.toString() : numValue.toFixed(1);
  };
  
  const criticRating = formatRating(game.criticratings);
  const userRating = formatRating(game.userratings);
  
  // Calculate dynamic maxLines for summary based on number of fields present
  const calculateSummaryMaxLines = (): number => {
    let fieldCount = 1; // Title is always present
    
    if (releaseDate) fieldCount++;
    if (game.genre && (Array.isArray(game.genre) ? game.genre.length > 0 : game.genre)) fieldCount++;
    if (criticRating !== null || userRating !== null || rating !== null) fieldCount++;
    fieldCount++; // Actions are always present
    
    // More fields = fewer lines for summary (min 2, max 6)
    return Math.max(2, Math.min(6, 7 - fieldCount));
  };
  
  const summaryMaxLines = calculateSummaryMaxLines();

  useEffect(() => {
    let isActive = true;
    const loadCollectionsForGame = async () => {
      if (!allCollections.length) {
        if (isActive) {
          setCollectionsWithSlideItems([]);
        }
        return;
      }

      const token = getApiToken() || "";
      const results: Array<{ collection: CollectionItem; slideItems: GameItem[] } | null> = [];
      for (const collection of allCollections) {
        try {
          const gameIds = await getCollectionGameIds(collection.id);
          if (!gameIds.includes(String(game.id))) {
            results.push(null);
            continue;
          }
          const games = gameIds
            .map((id) => libraryGames.find((g) => String(g.id) === String(id)))
            .filter((g): g is GameItem => Boolean(g));
          if (games.length === 0) {
            results.push(null);
            continue;
          }
          const childSlideItems = await buildChildCollectionLikeSlideItems(collection, allCollections, token);
          const slideItems = [...childSlideItems, ...games];
          results.push({ collection, slideItems });
        } catch (error) {
          results.push(null);
        }
      }

      if (isActive) {
        setCollectionsWithSlideItems(
          results.filter((entry): entry is { collection: CollectionItem; slideItems: GameItem[] } => Boolean(entry))
        );
      }
    };

    loadCollectionsForGame();
    return () => {
      isActive = false;
    };
  }, [allCollections, getCollectionGameIds, game.id, libraryGames]);

  const libraryMap = useMemo(() => {
    const map = new Map<string, GameItem>();
    for (const item of libraryGames) {
      map.set(String(item.id), item);
    }
    return map;
  }, [libraryGames]);

  const similarGamesNotInLibraryIds = useMemo(() => {
    if (!game.similarGames || game.similarGames.length === 0) return [];
    return game.similarGames
      .filter((sg) => !libraryMap.has(String(sg.id)))
      .map((sg) => sg.id);
  }, [game.similarGames, libraryMap]);

  const { detailsById } = useSimilarGamesDetails(similarGamesNotInLibraryIds);

  const allSimilarGamesOrdered = useMemo((): SimilarGameDisplayItem[] => {
    if (!game.similarGames || game.similarGames.length === 0) return [];
    return game.similarGames.map((sg) => {
      const libGame = libraryMap.get(String(sg.id));
      if (libGame) {
        return { type: "library", game: libGame };
      }
      const details = detailsById[String(sg.id)];
      return {
        type: "igdb",
        id: sg.id,
        name: details?.name ?? sg.name ?? String(sg.id),
        cover: details?.cover,
        year: details?.releaseDate ?? null,
      };
    });
  }, [game.similarGames, libraryMap, detailsById]);

  // When login is disabled, hide IGDB-only games (those with "New" badge)
  const similarGamesToShow = useMemo((): SimilarGameDisplayItem[] => {
    if (twitchLoginEnabled) return allSimilarGamesOrdered;
    return allSimilarGamesOrdered.filter((item) => item.type === "library");
  }, [twitchLoginEnabled, allSimilarGamesOrdered]);

  const dispatchCollectionLikeUpdated = (updatedItem: CollectionInfo) => {
    window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collection: updatedItem } }));
  };

  const openCollectionLikeEditModal = (col: CollectionItem) => {
    setEditingCollectionLike({
      id: String(col.id),
      title: col.title,
      summary: col.summary || "",
      cover: col.cover,
      background: (col as { background?: string }).background,
      showTitle: col.showTitle !== false,
      childs: col.childs || [],
    });
    setIsEditCollectionLikeModalOpen(true);
  };

  const handleCollectionLikePseudoEdit = (g: GameItem) => {
    const p = parseCollectionLikePseudoGameId(g.id);
    if (!p || p.resourceType !== "collections") return;
    const existing = allCollections.find((c) => String(c.id) === p.childId);
    if (existing) {
      openCollectionLikeEditModal(existing);
    } else {
      openCollectionLikeEditModal({
        id: p.childId,
        title: g.title,
        summary: typeof g.summary === "string" ? g.summary : "",
        cover: g.cover,
        childs: [],
        showTitle: (g as { showTitle?: boolean }).showTitle !== false,
      });
    }
  };

  const removeChildFromSliderParent = async (parentId: string, childId: string) => {
    const token = getApiToken();
    if (!token) return;
    try {
      const url = buildApiUrl(
        API_BASE,
        `/collections/${encodeURIComponent(parentId)}/childs/${encodeURIComponent(childId)}`
      );
      const res = await fetch(url, {
        method: "DELETE",
        headers: { "X-Auth-Token": token },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collectionId: String(parentId) } }));
    } catch (err) {
      console.error("Error removing child collection from parent:", err);
    }
  };

  const addChildToParent = async (source: CollectionItem, parentId?: string) => {
    if (!parentId) {
      setLinkSourceCollectionLike(source);
      return;
    }
    const token = getApiToken();
    if (!token) return;
    try {
      const url = buildApiUrl(
        API_BASE,
        `/collections/${encodeURIComponent(String(parentId))}/childs/${encodeURIComponent(String(source.id))}`
      );
      const res = await fetch(url, {
        method: "POST",
        headers: { "X-Auth-Token": token },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const recentKey = "recentCollectionLikeParents_collections";
      const current = JSON.parse(localStorage.getItem(recentKey) || "[]") as string[];
      const next = [String(parentId), ...current.filter((id) => String(id) !== String(parentId))].slice(0, 5);
      localStorage.setItem(recentKey, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collectionId: String(parentId) } }));
    } catch (err) {
      console.error("Error adding collection to parent:", err);
    }
  };

  const playFirstInCollection = async (_type: string, cid: string) => {
    try {
      const url = buildApiUrl(API_BASE, `/collections/${encodeURIComponent(cid)}/games`);
      const res = await fetch(url, {
        headers: { Accept: "application/json", "X-Auth-Token": getApiToken() || "" },
      });
      if (!res.ok) return;
      const json = await res.json();
      const gamesList = parseGamesFromJson(json);
      const first = gamesList.find((g) => g.executables && g.executables.length > 0);
      if (first) onPlay(first);
    } catch (e) {
      console.error("Error fetching collection games for play:", e);
    }
  };

  const handleRelatedGameClick = (selectedGame: GameItem) => {
    const rawId = String(selectedGame.id ?? "");
    if (rawId.startsWith("collectionlike:")) {
      const parts = rawId.split(":");
      const linkedId = parts[2];
      if (linkedId) {
        navigate(`/collections/${encodeURIComponent(linkedId)}`);
      }
      return;
    }
    navigate(`/game/${selectedGame.id}`);
  };
  const handleRelatedGameUpdate = (updatedGame: GameItem) => {
    updateGame(updatedGame);
    if (String(updatedGame.id) === String(game.id)) {
      onGameUpdate(updatedGame);
    }
  };

  const handleGenreClick = (genreTitle: string) => {
    const category = categoriesList.find((c) => c.title === genreTitle);
    if (category) {
      navigate(`/category/${category.id}`);
    }
  };

  // API returns genre as id[]; resolve to titles using categories map
  const genreTitles = useMemo(() => {
    const raw = Array.isArray(game.genre) ? game.genre : game.genre != null ? [game.genre] : [];
    return raw.map((id) => tagLabels.categories.get(String(id)) ?? String(id));
  }, [game.genre, tagLabels.categories]);

  const gameTypeLabel = useMemo(
    () => displayGameType(toGameTypeId(game.type)),
    [game.type]
  );

  return (
    <>
      <div className={`game-detail-libraries-bar-wrapper ${hasBackground && isBackgroundVisible ? 'game-detail-libraries-bar-transparent' : ''}`}>
        <LibrariesBar
          libraries={[]}
          activeLibrary={{ key: "game", type: "game" }}
          onSelectLibrary={() => {}}
          loading={false}
          error={null}
          coverSize={coverSize}
          onCoverSizeChange={handleCoverSizeChange}
          hideBackgroundToggle={activeSkinWeb.persistentLibraryShell}
          viewMode="grid"
          onViewModeChange={() => {}}
        />
      </div>
      <div className="game-detail-container">
        <div className="home-page-main-container game-detail-main-container">
          <main className="flex-1 home-page-content game-detail-content">
          <div className="home-page-layout game-detail-layout">
            <div className="home-page-content-wrapper game-detail-content-wrapper">
              <div className="home-page-scroll-container game-detail-scroll-container">
        <div className="pt-8 game-detail-header">
          {/* Cover Image */}
          <div className="game-detail-cover-wrapper">
            <Cover
              title={game.title}
              coverUrl={coverUrl}
              width={coverWidth}
              height={coverHeight}
              imageFit="fill"
              onPlay={(executableName?: string) => (executableName !== undefined ? (onPlay as (g: typeof game, ex?: string) => void)(game, executableName) : onPlay(game))}
              showTitle={false}
              titlePosition="overlay"
              detail={false}
              play={!!(game.executables && game.executables.length > 0)}
              showBorder={false}
            />
          </div>

          {/* Game Info Panel */}
          <div className="game-detail-info-panel">
            <div className="game-detail-info-content">
              <div className="game-detail-title-row">
                <h1 className="text-white game-detail-title">
                  {game.title}
                </h1>
              </div>
              {(() => {
                const validAgeRatings = game.ageRatings && game.ageRatings.length > 0
                  ? filterAgeRatingsByLocale(game.ageRatings, i18n.language)
                  : [];
                const hasValidAgeRatings = validAgeRatings.length > 0;
                const hasReleaseTypeOrAgeRatings = !!releaseDate || !!gameTypeLabel || hasValidAgeRatings;
                if (!hasReleaseTypeOrAgeRatings) return null;
                return (
                  <div className="text-white game-detail-release-date">
                    {releaseDate ? <span>{releaseDate}</span> : null}
                    {releaseDate && gameTypeLabel ? (
                      <span className="game-detail-age-ratings-inline">{" • "}</span>
                    ) : null}
                    {gameTypeLabel ? (
                      <span className="game-detail-type-label">{gameTypeLabel}</span>
                    ) : null}
                    {(releaseDate || gameTypeLabel) && hasValidAgeRatings && (
                      <span className="game-detail-age-ratings-inline">
                        {" • "}
                      </span>
                    )}
                    {hasValidAgeRatings && (
                      <span className="game-detail-age-ratings-inline">
                        <AgeRatings ageRatings={game.ageRatings || []} />
                      </span>
                    )}
                  </div>
                );
              })()}
              {tagLabelsReady && genreTitles.length > 0 && (
                <InlineTagList
                  items={genreTitles}
                  getLabel={(genre) => t(`genre.${genre}`, genre)}
                  onItemClick={handleGenreClick}
                  showMoreLabel={t("gameDetail.andMore", ", and more")}
                />
              )}
              <div className="game-detail-ratings">
                {(criticRating !== null) || (userRating !== null) ? (
                  <>
                    {criticRating !== null && (
                      <Tooltip text={t("gameDetail.criticRating")}>
                        <div className="text-white game-detail-rating-item">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="#FFD700"
                            stroke="#FFA500"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="game-detail-rating-icon"
                          >
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                          </svg>
                          {criticRating}
                        </div>
                      </Tooltip>
                    )}
                    {userRating !== null && (
                      <Tooltip text={t("gameDetail.userRating")}>
                        <div className="text-white game-detail-rating-item">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="#4CAF50"
                            stroke="#2E7D32"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="game-detail-rating-icon"
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          {userRating}
                        </div>
                      </Tooltip>
                    )}
                  </>
                ) : null}
                <StarRating 
                  rating={rating || 0} 
                  readOnly={false}
                  onRatingChange={isSavingRating ? undefined : onRatingChange}
                />
              </div>
              <div className="game-detail-actions">
                {(game.executables && game.executables.length > 0) ? (
                  <button
                    onClick={() => onPlay(game)}
                    className="game-detail-play-button"
                  >
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="game-detail-play-button-icon"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    {t("common.play")}
                  </button>
                ) : (
                    <button
                      onClick={() => setIsManageInstallationModalOpen(true)}
                      className="game-detail-link-executable-button"
                    >
                      <svg
                        width="28"
                        height="28"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="game-detail-link-executable-button-icon"
                      >
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                      </svg>
                      {t("gameDetail.linkExecutable")}
                    </button>
                )}
                <Tooltip text={t("common.edit")} delay={200}>
                  <button
                    onClick={() => editGame.openEditModal(game)}
                    className="game-detail-edit-button"
                  >
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
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </Tooltip>
                <AddToCollectionDropdown
                  game={game}
                  allCollections={allCollections}
                />
                {game.executables && game.executables.length > 1 && (
                  <AdditionalExecutablesDropdown
                    gameId={game.id}
                    gameExecutables={game.executables}
                  onPlayExecutable={(executableName: string) => {
                    // Call onPlay with game and executableName
                    // onPlay is openLauncher which accepts executableName as second parameter
                    if (typeof onPlay === 'function') {
                      (onPlay as any)(game, executableName);
                    }
                  }}
                  />
                )}
                <DropdownMenu
                  onAddToCollection={() => {}}
                  onManageInstallation={() => setIsManageInstallationModalOpen(true)}
                  gameId={game.id}
                  gameTitle={game.title}
                  gameExecutables={game.executables}
                  onGameDelete={onGameDelete ? (gameId: string) => {
                    if (game.id === gameId && onGameDelete) {
                      onGameDelete(game);
                    }
                  } : undefined}
                  onGameUpdate={onGameReload}
                  horizontal={true}
                  className="game-detail-dropdown-menu"
                  toolTipDelay={200}
                />
              </div>
              {editGame.selectedGame && (
                <EditGameModal
                  isOpen={editGame.isEditModalOpen}
                  onClose={editGame.closeEditModal}
                  game={editGame.selectedGame}
                  onGameUpdate={(updatedGame) => {
                    window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
                    onGameUpdate(updatedGame);
                  }}
                />
              )}
              <ManageInstallationModal
                isOpen={isManageInstallationModalOpen}
                onClose={() => setIsManageInstallationModalOpen(false)}
                game={game}
                onNeedRefresh={onRefetchGame}
                onGameUpdate={(updatedGame) => {
                  window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
                  onGameUpdate(updatedGame);
                }}
              />
              {game.summary && <Summary summary={game.summary} maxLines={summaryMaxLines} />}
            </div>
          </div>
        </div>
        
        {/* Media Gallery - Full Width */}
        {((game.screenshots && game.screenshots.length > 0) || (game.videos && game.videos.length > 0)) && (
          <div className="game-detail-media-section">
            <MediaGallery screenshots={game.screenshots} videos={game.videos} apiBase={API_BASE} />
          </div>
        )}
        
        {/* Game Info Block - Full Width */}
        <div className="game-detail-info-section">
          <GameInfoBlock game={game} />
        </div>
        {collectionsWithSlideItems.length > 0 && (
          <div className="game-detail-collections-section">
            <h3 className="game-detail-section-title">
              {t("libraries.collections", "Collections")}
            </h3>
            <div className="game-detail-collections-list">
              {collectionsWithSlideItems.map(({ collection, slideItems }) => (
                <div key={collection.id} className="game-detail-collection-group">
                  <ScrollableGamesSection
                    sectionId={`collection-${collection.id}`}
                    titleOverride={collection.title}
                    titleHref={`/collections/${collection.id}`}
                    disableAutoTranslate
                    games={slideItems}
                    onGameClick={handleRelatedGameClick}
                    onPlay={onPlay}
                    onGameUpdate={handleRelatedGameUpdate}
                    coverSize={140}
                    allCollections={allCollections}
                    allCollectionLikes={allCollections}
                    collectionLikeResourceType="collections"
                    sliderParentCollectionLikeId={String(collection.id)}
                    onRemoveChildFromSliderParent={(childId) =>
                      removeChildFromSliderParent(String(collection.id), childId)
                    }
                    onCollectionLikePseudoEdit={handleCollectionLikePseudoEdit}
                    onPlayFirstInCollectionLike={playFirstInCollection}
                    onCollectionLikePseudoAddToParent={addChildToParent}
                    onCollectionLikePseudoUpdated={dispatchCollectionLikeUpdated}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {editingCollectionLike && (
          <EditCollectionLikeModal
            isOpen={isEditCollectionLikeModalOpen}
            onClose={() => {
              setIsEditCollectionLikeModalOpen(false);
              setEditingCollectionLike(null);
            }}
            resourceType="collections"
            item={editingCollectionLike}
            onItemUpdate={(updated) => {
              setEditingCollectionLike(updated);
              dispatchCollectionLikeUpdated(updated);
            }}
          />
        )}
        {linkSourceCollectionLike && (
          <AddCollectionLikeToCollectionLikeModal
            isOpen={true}
            onClose={() => setLinkSourceCollectionLike(null)}
            sourceItem={linkSourceCollectionLike}
            resourceType="collections"
            allItems={allCollections}
            onLinked={() => setLinkSourceCollectionLike(null)}
          />
        )}
        {(game.similarGames && game.similarGames.length > 0) && similarGamesToShow.length > 0 && (
          <div className="game-detail-similar-section">
            <SimilarGamesList
              items={similarGamesToShow}
              coverSize={coverSize}
              allCollections={allCollections}
              onLibraryGameClick={handleRelatedGameClick}
              onIgdbGameClick={(id) => navigate(`/igdb-game/${id}`)}
              onPlay={onPlay}
              onGameUpdate={handleRelatedGameUpdate}
              sectionTitle={t("igdbInfo.similarGames", "Similar Games")}
            />
          </div>
        )}
      </div>
            </div>
          </div>
        </main>
        </div>
      </div>
    </>
  );
}
