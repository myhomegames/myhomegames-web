import { useState } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../config";
import { buildApiUrl, buildCoverUrl } from "../../utils/api";
import Cover from "../games/Cover";
import DropdownMenu from "../common/DropdownMenu";
import AdditionalExecutablesDropdown from "../games/AdditionalExecutablesDropdown";
import EditGameModal from "../games/EditGameModal";
import EditCollectionModal from "../collections/EditCollectionModal";
import { useEditGame } from "../common/actions";
import { useNavigate } from "react-router-dom";
import { useCollectionHasPlayableGame } from "../common/hooks/useCollectionHasPlayableGame";
import type { GameItem, CollectionItem, CollectionInfo } from "../../types";
import { formatGameDate } from "../../utils/date";
import "./SearchResultsList.css";

type SearchResultsListProps = {
  games: GameItem[];
  collections: CollectionItem[];
  onGameClick: (game: GameItem) => void;
  variant?: "popup" | "page"; // "popup" for dropdown, "page" for full page
  coverSize?: number; // Cover width (default: 100 for page, 60 for popup games, 40 for popup collections)
  onPlay?: (item: GameItem | CollectionItem) => void; // Play handler
  onCollectionClick?: (collection: CollectionItem) => void; // Collection click handler (for popup)
  onItemClick?: (item: GameItem | CollectionItem) => void; // Generic item click handler
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
  onGameClick: (game: GameItem) => void;
  variant?: "popup" | "page";
  coverSize?: number;
  onPlay?: (item: GameItem | CollectionItem) => void;
  onCollectionClick?: (collection: CollectionItem) => void;
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
  onGameClick,
  variant = "page",
  coverSize,
  onPlay,
  onCollectionClick,
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
  const isGame = "year" in item;
  const actualCoverSize = coverSize || (variant === "popup" ? POPUP_COVER_SIZE : FIXED_COVER_SIZE);
  const coverHeight = actualCoverSize * 1.5;
  const isPopup = variant === "popup";
  
  // Check if any game in collection has executables
  // Always enable the hook for collections, not just when onPlay is defined
  const { hasPlayableGame } = useCollectionHasPlayableGame(
    !isGame ? item.id : undefined,
    !isGame // Enable for collections, disable for games
  );

  const handleClick = () => {
    if (isGame) {
      onGameClick(item);
    } else {
      if (onCollectionClick) {
        onCollectionClick(item);
      } else {
        navigate(`/collections/${item.id}`);
      }
    }
  };

  const handlePlayClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onPlay) return;
    
    if (isGame) {
      onPlay(item);
    } else {
      // For collections, fetch and play the first game that has executables
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
          {onPlay && (isGame ? (item.executables && item.executables.length > 0) : hasPlayableGame === true) && (
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
}: SearchResultsListProps) {
  const { t } = useTranslation();
  const editGame = useEditGame();
  const [isEditCollectionModalOpen, setIsEditCollectionModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<CollectionInfo | null>(null);
  
  const totalResults = games.length + collections.length;
  if (totalResults === 0) {
    return <div className="text-gray-400 text-center">{t("table.noGames")}</div>;
  }

  const isPopup = variant === "popup";
  const containerClass = isPopup ? "" : "search-results-list-container";

  const allItems: (GameItem | CollectionItem)[] = [...collections, ...games];

  const handleEditClick = (item: GameItem | CollectionItem) => {
    if (onModalOpen) {
      onModalOpen();
    }
    if ("year" in item) {
      // It's a game
      editGame.openEditModal(item);
    } else {
      // It's a collection
      const collectionInfo: CollectionInfo = {
        id: item.id,
        title: item.title,
        summary: item.summary,
        cover: item.cover,
        background: item.background,
      };
      setSelectedCollection(collectionInfo);
      setIsEditCollectionModalOpen(true);
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

  const handleCollectionUpdate = (updatedCollection: CollectionInfo) => {
    // Dispatch event to update allCollections in App.tsx
    const updatedItem: CollectionItem = {
      id: updatedCollection.id,
      title: updatedCollection.title,
      summary: updatedCollection.summary,
      cover: updatedCollection.cover,
      background: updatedCollection.background,
    };
    window.dispatchEvent(new CustomEvent("collectionUpdated", { detail: { collection: updatedItem } }));
    if (onCollectionUpdate) {
      onCollectionUpdate(updatedItem);
    }
    setIsEditCollectionModalOpen(false);
    setSelectedCollection(null);
    if (onModalClose) {
      onModalClose();
    }
  };

  return (
    <>
      <div className={containerClass}>
        {allItems.map((item, index) => (
          <SearchResultItem
            key={item.id}
            item={item}
            onGameClick={onGameClick}
            variant={variant}
            coverSize={coverSize}
            onPlay={onPlay}
            onCollectionClick={onCollectionClick}
            hasBorder={isPopup && index < allItems.length - 1}
            onEditClick={handleEditClick}
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
      {selectedCollection && (
        <EditCollectionModal
          isOpen={isEditCollectionModalOpen}
          onClose={() => {
            setIsEditCollectionModalOpen(false);
            setSelectedCollection(null);
            if (onModalClose) {
              onModalClose();
            }
          }}
          collection={selectedCollection}
          onCollectionUpdate={handleCollectionUpdate}
        />
      )}
    </>
  );
}
