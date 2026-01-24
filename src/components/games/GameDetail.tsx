import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Cover from "./Cover";
import StarRating from "../common/StarRating";
import Summary from "../common/Summary";
import GameCategories from "./GameCategories";
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
import LibrariesBar from "../layout/LibrariesBar";
import { useEditGame, useExecutable } from "../common/actions";
import type { GameItem, CollectionItem } from "../../types";
import { formatGameDate } from "../../utils/date";
import { buildApiUrl, buildBackgroundUrl, buildCoverUrl } from "../../utils/api";
import { API_BASE, getApiToken } from "../../config";
import { useLoading } from "../../contexts/LoadingContext";
import { useCollections } from "../../contexts/CollectionsContext";
import { useLibraryGames } from "../../contexts/LibraryGamesContext";
import GamesList from "./GamesList";
import "./GameDetail.css";

type GameDetailProps = {
  game: GameItem;
  coverUrl: string;
  onPlay: (game: GameItem) => void;
  allCollections?: CollectionItem[];
  onGameUpdate?: (updatedGame: GameItem) => void;
  onGameDelete?: (game: GameItem) => void;
};

export default function GameDetail({
  game,
  coverUrl,
  onPlay,
  allCollections = [],
  onGameUpdate,
  onGameDelete,
}: GameDetailProps) {
  const { t, i18n } = useTranslation();
  const { setLoading } = useLoading();
  const [localGame, setLocalGame] = useState<GameItem>(game);
  const [isManageInstallationModalOpen, setIsManageInstallationModalOpen] = useState(false);
  const editGame = useEditGame();
  
  // Use executable hook (handles both upload and unlink)
  const executable = useExecutable({
    game: localGame,
    onGameUpdate: (updatedGame) => {
      setLocalGame(updatedGame);
      // Dispatch event to update allGames in App.tsx
      window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
      if (onGameUpdate) {
        onGameUpdate(updatedGame);
      }
    },
  });
  
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
    setLoading(true);
    try {
      const url = buildApiUrl(API_BASE, `/games/${localGame.id}`);
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
          ...localGame,
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
      }
    } catch (error) {
      console.error('Error updating rating:', error);
    } finally {
      setLoading(false);
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
        executable={executable}
        allCollections={allCollections}
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
  editGame,
  onGameUpdate,
  onGameReload,
  onGameDelete,
  executable,
  allCollections,
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
  editGame: ReturnType<typeof useEditGame>;
  onGameUpdate: (updatedGame: GameItem) => void;
  onGameReload: (updatedGame: GameItem) => void;
  onGameDelete?: (game: GameItem) => void;
  executable: ReturnType<typeof useExecutable>;
  allCollections: CollectionItem[];
  isManageInstallationModalOpen: boolean;
  setIsManageInstallationModalOpen: (open: boolean) => void;
  t: (key: string, defaultValue?: string) => string;
  i18n: { language: string };
}) {
  const navigate = useNavigate();
  const { hasBackground, isBackgroundVisible } = useBackground();
  const { getCollectionGameIds } = useCollections();
  const { games: libraryGames, updateGame, removeGame } = useLibraryGames();
  const [collectionsWithGames, setCollectionsWithGames] = useState<
    Array<{ collection: CollectionItem; games: GameItem[] }>
  >([]);
  
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
          setCollectionsWithGames([]);
        }
        return;
      }

      const results = await Promise.all(
        allCollections.map(async (collection) => {
          try {
            const gameIds = await getCollectionGameIds(collection.id);
            if (!gameIds.includes(String(game.id))) {
              return null;
            }
            const games = gameIds
              .map((id) => libraryGames.find((g) => String(g.id) === String(id)))
              .filter((g): g is GameItem => Boolean(g));
            if (games.length === 0) {
              return null;
            }
            return { collection, games };
          } catch (error) {
            return null;
          }
        })
      );

      if (isActive) {
        setCollectionsWithGames(
          results.filter((entry): entry is { collection: CollectionItem; games: GameItem[] } => Boolean(entry))
        );
      }
    };

    loadCollectionsForGame();
    return () => {
      isActive = false;
    };
  }, [allCollections, getCollectionGameIds, game.id, libraryGames]);

  const similarGamesInLibrary = useMemo(() => {
    const similarIds = new Set(
      (game.similarGames || []).map((similar) => String(similar.id))
    );
    return libraryGames.filter((libraryGame) => similarIds.has(String(libraryGame.id)));
  }, [game.similarGames, libraryGames]);
  const handleRelatedGameClick = (selectedGame: GameItem) => {
    navigate(`/game/${selectedGame.id}`);
  };
  const handleRelatedGameUpdate = (updatedGame: GameItem) => {
    updateGame(updatedGame);
    if (String(updatedGame.id) === String(game.id)) {
      onGameUpdate(updatedGame);
    }
  };
  const handleRelatedGameDelete = (deletedGame: GameItem) => {
    removeGame(deletedGame.id);
    if (String(deletedGame.id) === String(game.id) && onGameDelete) {
      onGameDelete(deletedGame);
    }
  };
  
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
              onPlay={() => onPlay(game)}
              showTitle={false}
              titlePosition="overlay"
              detail={false}
              play={!!(game.executables && game.executables.length > 0)}
              showBorder={false}
            />
          </div>

          {/* Game Info Panel */}
          <div className="game-detail-info-panel" style={{ minHeight: `${coverHeight}px` }}>
            <div className="game-detail-info-content">
              <h1 className="text-white game-detail-title">
                {game.title}
              </h1>
              {releaseDate && (() => {
                const validAgeRatings = game.ageRatings && game.ageRatings.length > 0 
                  ? filterAgeRatingsByLocale(game.ageRatings, i18n.language)
                  : [];
                const hasValidAgeRatings = validAgeRatings.length > 0;
                
                return (
                  <div className="text-white game-detail-release-date">
                    {releaseDate}
                    {hasValidAgeRatings && (
                      <span className="game-detail-age-ratings-inline">
                        {"•   "}
                        <AgeRatings ageRatings={game.ageRatings || []} />
                      </span>
                    )}
                  </div>
                );
              })()}
              <GameCategories game={game} />
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
                  onRatingChange={onRatingChange}
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
                    <>
                    <button
                      onClick={executable.handleBrowseClick}
                      disabled={executable.isUploading}
                      className="game-detail-link-executable-button"
                    >
                      <>
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
                        {executable.isUploading ? t("gameDetail.uploading", "Uploading...") : t("gameDetail.linkExecutable")}
                      </>
                    </button>
                    <input
                      ref={executable.fileInputRef}
                      id="game-executable-input"
                      name="executable"
                      type="file"
                      className="game-detail-executable-input"
                      accept=".sh,.bat"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          await executable.handleFileSelect(file);
                          // Reset the input so the same file can be selected again
                          e.target.value = "";
                        }
                      }}
                    />
                  </>
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
                    // Dispatch event to update allGames in App.tsx
                    window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
                    onGameUpdate(updatedGame);
                    editGame.closeEditModal();
                  }}
                />
              )}
              <ManageInstallationModal
                isOpen={isManageInstallationModalOpen}
                onClose={() => setIsManageInstallationModalOpen(false)}
                game={game}
                onGameUpdate={(updatedGame) => {
                  // Dispatch event to update allGames in App.tsx
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
            <MediaGallery screenshots={game.screenshots} videos={game.videos} />
          </div>
        )}
        
        {/* Game Info Block - Full Width */}
        <div className="game-detail-info-section">
          <GameInfoBlock game={game} />
        </div>
        {collectionsWithGames.length > 0 && (
          <div className="game-detail-collections-section">
            <h3 className="game-detail-section-title">
              {t("libraries.collections", "Collections")}
            </h3>
            <div className="game-detail-collections-list">
              {collectionsWithGames.map(({ collection, games }) => (
                <div key={collection.id} className="game-detail-collection-group">
                  <div className="game-detail-collection-title">{collection.title}</div>
                  <GamesList
                    games={games}
                    onGameClick={handleRelatedGameClick}
                    onPlay={onPlay}
                    onGameUpdate={handleRelatedGameUpdate}
                    onGameDelete={handleRelatedGameDelete}
                    buildCoverUrl={buildCoverUrl}
                    coverSize={140}
                    viewMode="grid"
                    allCollections={allCollections}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        {similarGamesInLibrary.length > 0 && (
          <div className="game-detail-similar-section">
            <h3 className="game-detail-section-title">
              {t("igdbInfo.similarGames", "Similar Games")}
            </h3>
            <GamesList
              games={similarGamesInLibrary}
              onGameClick={handleRelatedGameClick}
              onPlay={onPlay}
              onGameUpdate={handleRelatedGameUpdate}
              onGameDelete={handleRelatedGameDelete}
              buildCoverUrl={buildCoverUrl}
              coverSize={140}
              viewMode="grid"
              allCollections={allCollections}
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
