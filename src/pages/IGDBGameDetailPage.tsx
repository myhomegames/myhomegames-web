import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Cover from "../components/games/Cover";
import Summary from "../components/common/Summary";
import InlineTagList from "../components/common/InlineTagList";
import GameInfoBlock from "../components/games/GameInfoBlock";
import MediaGallery from "../components/games/MediaGallery";
import AgeRatings, { filterAgeRatingsByLocale } from "../components/games/AgeRatings";
import BackgroundManager, { useBackground } from "../components/common/BackgroundManager";
import LibrariesBar from "../components/layout/LibrariesBar";
import Tooltip from "../components/common/Tooltip";
import { useAddGame } from "../components/common/actions";
import { buildApiUrl } from "../utils/api";
import { API_BASE, getApiToken, getTwitchClientId, getTwitchClientSecret } from "../config";
import { useLoading } from "../contexts/LoadingContext";
import { useCategories } from "../contexts/CategoriesContext";
import type { GameItem, IGDBGame } from "../types";
import { formatIGDBGameDate } from "../utils/date";
import type { TFunction } from "i18next";
import "./IGDBGameDetailPage.css";

export default function IGDBGameDetailPage() {
  const { t, i18n } = useTranslation();
  const { igdbId } = useParams<{ igdbId: string }>();
  const navigate = useNavigate();
  const { isLoading, setLoading } = useLoading();
  const [game, setGame] = useState<IGDBGame | null>(null);
  
  const addGame = useAddGame({
    onGameAdded: (addedGame) => {
      // Navigate to the newly added game detail page
      if (addedGame?.id) {
        navigate(`/game/${addedGame.id}`);
      } else {
        // If no gameId returned, reload games and navigate to home
        navigate("/");
      }
    },
    onError: (error) => {
      alert(t("igdbGameDetail.errorAdding") + ": " + error);
    },
  });

  const fetchIGDBGame = useCallback(async (gameId: number) => {
    setLoading(true);
    try {
      // Fetch game details with high-res cover from dedicated endpoint
      const url = buildApiUrl(API_BASE, `/igdb/game/${gameId}`);
      const headers: Record<string, string> = {
        Accept: "application/json",
        "X-Auth-Token": getApiToken(),
      };
      
      // Add Twitch credentials for IGDB API
      const clientId = getTwitchClientId();
      const clientSecret = getTwitchClientSecret();
      if (clientId) headers["X-Twitch-Client-Id"] = clientId;
      if (clientSecret) headers["X-Twitch-Client-Secret"] = clientSecret;

      const res = await fetch(url, {
        headers,
      });

      if (!res.ok) {
        if (res.status === 404) {
          setGame(null);
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }

      const foundGame = await res.json();

      if (!foundGame) {
        setGame(null);
        return;
      }

      setGame(foundGame);
    } catch (err: any) {
      const errorMessage = String(err.message || err);
      console.error("Error fetching IGDB game:", errorMessage);
      setGame(null);
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  useEffect(() => {
    // Always fetch game details with high-res cover from dedicated endpoint
    // This ensures we get the high-resolution cover even if game data was passed via state
    if (igdbId) {
      fetchIGDBGame(parseInt(igdbId, 10));
    }
  }, [igdbId, fetchIGDBGame]);

  async function handleMarkAsOwned() {
    if (!game) return;
    await addGame.addGame(game);
  }

  if (isLoading) {
    return null;
  }

  if (!game) {
    return (
      <div className="bg-[#1a1a1a] text-white flex items-center justify-center igdb-game-detail-not-found">
        <div className="text-center">
          <div className="text-gray-400">{t("igdbGameDetail.notFound")}</div>
        </div>
      </div>
    );
  }

  const coverWidth = 256;
  const coverHeight = 384;
  const coverUrl = game.cover || "";
  const hasBackground = Boolean(game?.background && game.background.trim() !== "");
  const backgroundUrl = game?.background || "";

  // Get coverSize from localStorage (same as GameDetail)
  const coverSize = (() => {
    const saved = localStorage.getItem("coverSize");
    return saved ? parseInt(saved, 10) : 150;
  })();

  const handleCoverSizeChange = (size: number) => {
    localStorage.setItem("coverSize", size.toString());
  };

  return (
    <BackgroundManager 
      backgroundUrl={backgroundUrl} 
      hasBackground={hasBackground}
      elementId={`igdb-${game.id}`}
    >
      <IGDBGameDetailContent
        game={game}
        coverUrl={coverUrl}
        coverWidth={coverWidth}
        coverHeight={coverHeight}
        coverSize={coverSize}
        handleCoverSizeChange={handleCoverSizeChange}
        markingAsOwned={addGame.isAdding}
        onMarkAsOwned={handleMarkAsOwned}
        t={t as any}
        i18n={i18n}
      />
    </BackgroundManager>
  );
}

function IGDBGameDetailContent({
  game,
  coverUrl,
  coverWidth,
  coverHeight,
  coverSize,
  handleCoverSizeChange,
  markingAsOwned,
  onMarkAsOwned,
  t,
  i18n,
}: {
  game: IGDBGame;
  coverUrl: string;
  coverWidth: number;
  coverHeight: number;
  coverSize: number;
  handleCoverSizeChange: (size: number) => void;
  markingAsOwned: boolean;
  onMarkAsOwned: () => void;
  t: TFunction;
  i18n: import("i18next").i18n;
}) {
  // Helper function to format release date
  const formatReleaseDate = (game: IGDBGame): string | null => {
    return formatIGDBGameDate(game, t, i18n);
  };

  // Helper function to format rating value (IGDB uses 0-100 scale, convert to 0-10)
  const formatRating = (value: number | null | undefined): string | null => {
    if (value === null || value === undefined || isNaN(value)) {
      return null;
    }
    const numValue = Number(value);
    // IGDB ratings are on 0-100 scale, convert to 0-10
    if (numValue >= 0 && numValue <= 100) {
      const convertedValue = numValue / 10;
      // Format to show decimal only if present (e.g., 8.5 instead of 8.50, but 8 instead of 8.0)
      return convertedValue % 1 === 0 ? convertedValue.toString() : convertedValue.toFixed(1);
    }
    return null;
  };

  // Filter and validate genres
  const validGenres = game && game.genres && Array.isArray(game.genres) && game.genres.length > 0
    ? game.genres
        .filter((g) => g && typeof g === "string" && g.trim())
        .map((g) => g.trim())
    : null;

  const criticRatingFormatted = formatRating(game.criticRating);
  const userRatingFormatted = formatRating(game.userRating);
  const { hasBackground, isBackgroundVisible } = useBackground();
  const navigate = useNavigate();
  const { categories } = useCategories();

  const handleGenreClick = (genreTitle: string) => {
    const category = categories.find((c) => c.title === genreTitle);
    if (category) {
      navigate(`/category/${category.id}`);
    }
  };
  
  // Calculate dynamic maxLines for summary based on number of fields present
  const calculateSummaryMaxLines = (): number => {
    let fieldCount = 1; // Title is always present
    
    if (formatReleaseDate(game)) fieldCount++;
    if (validGenres && validGenres.length > 0) fieldCount++;
    if (criticRatingFormatted !== null || userRatingFormatted !== null) fieldCount++;
    fieldCount++; // Actions are always present
    
    // More fields = fewer lines for summary (min 2, max 6)
    return Math.max(2, Math.min(6, 7 - fieldCount));
  };
  
  const summaryMaxLines = calculateSummaryMaxLines();

  return (
    <>
      <div 
        className={`igdb-game-detail-libraries-bar-wrapper ${hasBackground && isBackgroundVisible ? 'game-detail-libraries-bar-transparent' : ''}`}
      >
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
          hideBackgroundToggle={true}
        />
      </div>
      <div className="igdb-game-detail-container">
        <div className="home-page-main-container igdb-game-detail-main-container">
          <main className="flex-1 home-page-content igdb-game-detail-content">
          <div className="home-page-layout igdb-game-detail-layout">
            <div className="home-page-content-wrapper igdb-game-detail-content-wrapper">
              <div className="home-page-scroll-container igdb-game-detail-scroll-container">
        <div className="pt-8 igdb-game-detail-header">
          {/* Cover Image */}
          <div className="igdb-game-detail-cover-wrapper">
            <Cover
              title={game.name}
              coverUrl={coverUrl}
              width={coverWidth}
              height={coverHeight}
              showTitle={false}
              titlePosition="overlay"
              detail={false}
              play={false}
              showBorder={false}
            />
          </div>

          {/* Game Info Panel */}
          <div className="igdb-game-detail-info-panel" style={{ minHeight: `${coverHeight}px` }}>
            <div className="igdb-game-detail-info-content">
              <h1 className="text-white igdb-game-detail-title">
                {game.name}
              </h1>
              {formatReleaseDate(game) && (() => {
                const validAgeRatings = game.ageRatings && game.ageRatings.length > 0 
                  ? filterAgeRatingsByLocale(game.ageRatings, i18n.language)
                  : [];
                const hasValidAgeRatings = validAgeRatings.length > 0;
                
                return (
                  <div className="text-white igdb-game-detail-release-date">
                    {formatReleaseDate(game)}
                    {hasValidAgeRatings && (
                      <span className="igdb-game-detail-age-ratings-inline">
                        {"•   "}
                        <AgeRatings ageRatings={game.ageRatings || []} />
                      </span>
                    )}
                  </div>
                );
              })()}
            {validGenres && validGenres.length > 0 && (
              <InlineTagList
                items={validGenres}
                getLabel={(genre) => t(`genre.${genre}`, genre)}
                onItemClick={handleGenreClick}
                showMoreLabel={t("gameDetail.andMore", ", and more")}
              />
            )}
              {(criticRatingFormatted !== null) || (userRatingFormatted !== null) ? (
                  <div className="igdb-game-detail-ratings">
                    {criticRatingFormatted !== null && (
                      <Tooltip text={t("gameDetail.criticRating")}>
                        <div className="text-white igdb-game-detail-rating-item">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="#FFD700"
                            stroke="#FFA500"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="igdb-game-detail-rating-icon"
                          >
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                          </svg>
                          {criticRatingFormatted}
                        </div>
                      </Tooltip>
                    )}
                    {userRatingFormatted !== null && (
                      <Tooltip text={t("gameDetail.userRating")}>
                        <div className="text-white igdb-game-detail-rating-item">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="#4CAF50"
                            stroke="#2E7D32"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="igdb-game-detail-rating-icon"
                          >
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                          </svg>
                          {userRatingFormatted}
                        </div>
                      </Tooltip>
                    )}
                  </div>
                ) : null}
              <div className="game-detail-actions">
                <button
                  onClick={onMarkAsOwned}
                  disabled={markingAsOwned}
                  className="igdb-game-detail-mark-owned-button"
                >
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="igdb-game-detail-mark-owned-button-icon"
                  >
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  {markingAsOwned ? t("igdbGameDetail.adding") : t("igdbGameDetail.add")}
                </button>
              </div>
              {game.summary && <Summary summary={game.summary} maxLines={summaryMaxLines} />}
            </div>
          </div>
        </div>
        
        {/* Media Gallery - Full Width */}
        {((game.screenshots && game.screenshots.length > 0) || (game.videos && game.videos.length > 0)) && (
          <div className="igdb-game-detail-media-section">
            <MediaGallery screenshots={game.screenshots} videos={game.videos} />
          </div>
        )}
        
        {/* Game Info Block - Full Width */}
        <div className="igdb-game-detail-info-section">
          <GameInfoBlock game={game} />
        </div>
              </div>
            </div>
          </div>
          </main>
        </div>
      </div>
    </>
  );
}

