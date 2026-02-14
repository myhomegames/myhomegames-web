import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../config";
import { buildApiUrl, buildCoverUrl } from "../../utils/api";
import Cover from "../games/Cover";
import DropdownMenu from "../common/DropdownMenu";
import AdditionalExecutablesDropdown from "../games/AdditionalExecutablesDropdown";
import EditGameModal from "../games/EditGameModal";
import EditCollectionLikeModal from "../collections/EditCollectionLikeModal";
import { useEditGame } from "../common/actions";
import { useNavigate } from "react-router-dom";
import { useCollectionHasPlayableGame } from "../common/hooks/useCollectionHasPlayableGame";
import type { GameItem, CollectionItem, CollectionInfo } from "../../types";
import { formatGameDate } from "../../utils/date";
import "./SearchResultsList.css";

type SearchResultType = "game" | "collection" | "developer" | "publisher";

type SearchResultsListProps = {
  games: GameItem[];
  collections: CollectionItem[];
  developers?: CollectionItem[];
  publishers?: CollectionItem[];
  onGameClick: (game: GameItem) => void;
  variant?: "popup" | "page";
  coverSize?: number;
  onPlay?: (item: GameItem | CollectionItem) => void;
  onCollectionClick?: (collection: CollectionItem) => void;
  onDeveloperClick?: (developer: CollectionItem) => void;
  onPublisherClick?: (publisher: CollectionItem) => void;
  onItemClick?: (item: GameItem | CollectionItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  onCollectionUpdate?: (updatedCollection: CollectionItem) => void;
  onCollectionDelete?: (deletedCollection: CollectionItem) => void;
  onModalOpen?: () => void;
  onModalClose?: () => void;
  allCollections?: CollectionItem[];
};

const FIXED_COVER_SIZE = 100; // Fixed size corresponding to minimum slider position
const POPUP_COVER_SIZE = 60;

type SearchResultItemProps = {
  item: GameItem | CollectionItem;
  resultType: SearchResultType;
  onGameClick: (game: GameItem) => void;
  variant?: "popup" | "page";
  coverSize?: number;
  onPlay?: (item: GameItem | CollectionItem) => void;
  onCollectionClick?: (collection: CollectionItem) => void;
  onDeveloperClick?: (developer: CollectionItem) => void;
  onPublisherClick?: (publisher: CollectionItem) => void;
  hasBorder?: boolean;
  onEditClick?: (item: GameItem | CollectionItem) => void;
  onGameDelete?: (deletedGame: GameItem) => void;
  onGameUpdate?: (updatedGame: GameItem) => void;
  onCollectionDelete?: (deletedCollection: CollectionItem) => void;
  onCollectionUpdate?: (updatedCollection: CollectionItem) => void;
  onModalOpen?: () => void;
  onModalClose?: () => void;
};

function SearchResultItem({
  item,
  resultType,
  onGameClick,
  variant = "page",
  coverSize,
  onPlay,
  onCollectionClick,
  onDeveloperClick,
  onPublisherClick,
  hasBorder = false,
  onEditClick,
  onGameDelete,
  onGameUpdate,
  onCollectionDelete,
  onCollectionUpdate,
  onModalOpen,
  onModalClose,
}: SearchResultItemProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isGame = resultType === "game";
  const isCollection = resultType === "collection";
  const actualCoverSize = coverSize || (variant === "popup" ? POPUP_COVER_SIZE : FIXED_COVER_SIZE);
  const coverHeight = actualCoverSize * 1.5;
  const isPopup = variant === "popup";

  const { hasPlayableGame } = useCollectionHasPlayableGame(
    isCollection ? item.id : undefined,
    isCollection
  );

  const handleClick = () => {
    if (resultType === "game") {
      onGameClick(item as GameItem);
    } else if (resultType === "collection") {
      if (onCollectionClick) {
        onCollectionClick(item as CollectionItem);
      } else {
        navigate(`/collections/${item.id}`);
      }
    } else if (resultType === "developer") {
      if (onDeveloperClick) {
        onDeveloperClick(item as CollectionItem);
      } else {
        navigate(`/developers/${item.id}`);
      }
    } else if (resultType === "publisher") {
      if (onPublisherClick) {
        onPublisherClick(item as CollectionItem);
      } else {
        navigate(`/publishers/${item.id}`);
      }
    }
  };

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onPlay) return;

    if (isGame) {
      onPlay(item);
    } else if (isCollection) {
      try {
        const url = buildApiUrl(API_BASE, `/collections/${item.id}/games`);
        const res = await fetch(url, {
          headers: {
            Accept: "application/json",
            "X-Auth-Token": getApiToken(),
          },
        });
        if (res.ok) {
          const json = await res.json();
          const games = json.games || [];
          // Find the first game that has executables (for playing)
          const gameWithExecutables = games.find((g: any) => g.executables && g.executables.length > 0);
          if (gameWithExecutables) {
            const gameItem: GameItem = {
              id: gameWithExecutables.id,
              title: gameWithExecutables.title,
              summary: gameWithExecutables.summary || "",
              cover: gameWithExecutables.cover,
              day: gameWithExecutables.day || null,
              month: gameWithExecutables.month || null,
              year: gameWithExecutables.year || null,
              stars: gameWithExecutables.stars || null,
              genre: gameWithExecutables.genre || null,
              executables: gameWithExecutables.executables || null,
            };
            onPlay(gameItem);
          }
        }
      } catch (err) {
        console.error("Error fetching collection games for play:", err);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isPopup && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      handleClick();
    }
  };

  const subtitle = isGame
    ? formatGameDate(item, t, i18n)
    : resultType === "developer"
      ? t("search.developer")
      : resultType === "publisher"
        ? t("search.publisher")
        : t("search.collection");

  return (
    <div
      key={item.id}
      className={`group cursor-pointer ${isPopup ? `mhg-dropdown-item search-dropdown-item ${hasBorder ? "has-border" : ""}` : "mb-6 search-results-list-item"}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role={isPopup ? "button" : undefined}
      tabIndex={isPopup ? 0 : undefined}
      style={isPopup ? { display: "flex", alignItems: "center", gap: "16px" } : undefined}
    >
      <Cover
        key={`${item.id}-${item.cover}`}
        title={item.title}
        coverUrl={buildCoverUrl(API_BASE, item.cover, true)}
        width={actualCoverSize}
        height={coverHeight}
        onClick={handleClick}
        showTitle={(item as { showTitle?: boolean }).showTitle !== false}
        subtitle={subtitle}
        titlePosition="bottom"
        detail={true}
        play={false}
        showBorder={false}
      />
      {(onPlay || onEditClick) && (
        <div className="search-result-right-actions">
          {onPlay && (isGame ? ((item as GameItem).executables && (item as GameItem).executables!.length > 0) : hasPlayableGame === true) && (
            <button
              className="search-result-play-button"
              onClick={handlePlayClick}
              aria-label={isGame ? "Play game" : "Play collection"}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 5v14l11-7z"
                  fill="currentColor"
                />
              </svg>
            </button>
          )}
          {onEditClick && (
            <div className="search-result-actions">
              {isGame && (item as GameItem).executables && (item as GameItem).executables!.length > 1 && onPlay && (
                <AdditionalExecutablesDropdown
                  gameId={item.id}
                  gameExecutables={(item as GameItem).executables!}
                  onPlayExecutable={(executableName: string) => {
                    if (onPlay) {
                      (onPlay as any)(item, executableName);
                    }
                  }}
                />
              )}
              <DropdownMenu
                onEdit={() => onEditClick(item)}
                gameId={isGame ? item.id : undefined}
                gameTitle={isGame ? item.title : undefined}
                gameExecutables={isGame ? (item as GameItem).executables : undefined}
                onGameDelete={isGame && onGameDelete ? (gameId: string) => {
                  if (item.id === gameId) {
                    onGameDelete(item);
                  }
                } : undefined}
                onGameUpdate={isGame && onGameUpdate ? (updatedGame) => {
                  if (updatedGame.id === item.id) {
                    onGameUpdate(updatedGame);
                  }
                } : undefined}
                collectionId={!isGame ? item.id : undefined}
                collectionTitle={!isGame ? item.title : undefined}
                onCollectionDelete={!isGame && onCollectionDelete ? (collectionId: string) => {
                  if (item.id === collectionId) {
                    onCollectionDelete(item);
                  }
                } : undefined}
                onCollectionUpdate={!isGame && onCollectionUpdate ? (updatedCollection) => {
                  // Convert CollectionInfo to CollectionItem
                  const updatedItem: CollectionItem = {
                    id: updatedCollection.id,
                    title: updatedCollection.title,
                    summary: updatedCollection.summary,
                    cover: updatedCollection.cover,
                    gameCount: "gameCount" in item ? item.gameCount : undefined,
                  };
                  if (updatedItem.id === item.id) {
                    onCollectionUpdate(updatedItem);
                  }
                } : undefined}
                className="search-result-dropdown-menu"
                onModalOpen={onModalOpen}
                onModalClose={onModalClose}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchResultsList({
  games,
  collections,
  onGameClick,
  variant = "page",
  coverSize,
  onPlay,
  onCollectionClick,
  onGameUpdate,
  onGameDelete,
  onCollectionUpdate,
  onCollectionDelete,
  onModalOpen,
  onModalClose,
  developers = [],
  publishers = [],
  onDeveloperClick,
  onPublisherClick,
}: SearchResultsListProps) {
  const { t } = useTranslation();
  const editGame = useEditGame();
  const [isEditCollectionLikeModalOpen, setIsEditCollectionLikeModalOpen] = useState(false);
  const [selectedCollectionLike, setSelectedCollectionLike] = useState<{ item: CollectionInfo; resourceType: "collections" | "developers" | "publishers" } | null>(null);

  const totalResults = games.length + collections.length + developers.length + publishers.length;
  if (totalResults === 0) {
    return <div className="text-gray-400 text-center">{t("table.noGames")}</div>;
  }

  const isPopup = variant === "popup";
  const containerClass = isPopup ? "" : "search-results-list-container";

  const allItemsWithType: { item: GameItem | CollectionItem; resultType: SearchResultType }[] = [
    ...collections.map((c) => ({ item: c, resultType: "collection" as const })),
    ...games.map((g) => ({ item: g, resultType: "game" as const })),
    ...developers.map((d) => ({ item: d, resultType: "developer" as const })),
    ...publishers.map((p) => ({ item: p, resultType: "publisher" as const })),
  ];

  const handleEditClick = (item: GameItem | CollectionItem, resultType: SearchResultType) => {
    if (onModalOpen) {
      onModalOpen();
    }
    if (resultType === "game") {
      editGame.openEditModal(item as GameItem);
    } else if (resultType === "collection" || resultType === "developer" || resultType === "publisher") {
      const info: CollectionInfo = {
        id: item.id,
        title: item.title,
        summary: item.summary,
        cover: item.cover,
        background: item.background,
      };
      const resourceType = resultType === "collection" ? "collections" : resultType === "developer" ? "developers" : "publishers";
      setSelectedCollectionLike({ item: info, resourceType });
      setIsEditCollectionLikeModalOpen(true);
    }
  };

  const handleGameUpdate = (updatedGame: GameItem) => {
    // Dispatch event to update allGames in App.tsx
    window.dispatchEvent(new CustomEvent("gameUpdated", { detail: { game: updatedGame } }));
    if (onGameUpdate) {
      onGameUpdate(updatedGame);
    }
    editGame.closeEditModal();
    if (onModalClose) {
      onModalClose();
    }
  };

  const handleCollectionLikeUpdate = (updated: CollectionInfo) => {
    const updatedItem: CollectionItem = {
      id: updated.id,
      title: updated.title,
      summary: updated.summary,
      cover: updated.cover,
      background: updated.background,
    };
    if (selectedCollectionLike?.resourceType === "collections") {
      window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collection: updatedItem } }));
      if (onCollectionUpdate) onCollectionUpdate(updatedItem);
    } else if (selectedCollectionLike?.resourceType === "developers") {
      window.dispatchEvent(new CustomEvent("developerUpdated", { detail: { developer: updatedItem } }));
    } else if (selectedCollectionLike?.resourceType === "publishers") {
      window.dispatchEvent(new CustomEvent("publisherUpdated", { detail: { publisher: updatedItem } }));
    }
    setIsEditCollectionLikeModalOpen(false);
    setSelectedCollectionLike(null);
    if (onModalClose) onModalClose();
  };

  return (
    <>
      <div className={containerClass}>
        {allItemsWithType.map(({ item, resultType }, index) => (
          <SearchResultItem
            key={`${resultType}-${item.id}`}
            item={item}
            resultType={resultType}
            onGameClick={onGameClick}
            variant={variant}
            coverSize={coverSize}
            onPlay={onPlay}
            onCollectionClick={onCollectionClick}
            onDeveloperClick={onDeveloperClick}
            onPublisherClick={onPublisherClick}
            hasBorder={isPopup && index < allItemsWithType.length - 1}
            onEditClick={(item) => handleEditClick(item, resultType)}
            onGameDelete={onGameDelete}
            onGameUpdate={onGameUpdate}
            onCollectionDelete={onCollectionDelete}
            onCollectionUpdate={onCollectionUpdate}
            onModalOpen={onModalOpen}
            onModalClose={onModalClose}
          />
        ))}
      </div>
      {editGame.selectedGame && (
        <EditGameModal
          isOpen={editGame.isEditModalOpen}
          onClose={() => {
            editGame.closeEditModal();
            if (onModalClose) {
              onModalClose();
            }
          }}
          game={editGame.selectedGame}
          onGameUpdate={handleGameUpdate}
        />
      )}
      {selectedCollectionLike && (
        <EditCollectionLikeModal
          isOpen={isEditCollectionLikeModalOpen}
          onClose={() => {
            setIsEditCollectionLikeModalOpen(false);
            setSelectedCollectionLike(null);
            if (onModalClose) onModalClose();
          }}
          resourceType={selectedCollectionLike.resourceType}
          item={selectedCollectionLike.item}
          onItemUpdate={handleCollectionLikeUpdate}
        />
      )}
    </>
  );
}
