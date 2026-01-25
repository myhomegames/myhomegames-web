import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import type React from "react";
import DropdownMenu from "../common/DropdownMenu";
import AddToCollectionDropdown from "./AddToCollectionDropdown";
import AdditionalExecutablesDropdown from "./AdditionalExecutablesDropdown";
import Tooltip from "../common/Tooltip";
import type { CollectionItem, GameItem } from "../../types";
import "./Cover.css";

type CoverProps = {
  title: string;
  coverUrl: string;
  width: number;
  height: number;
  onPlay?: () => void;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  gameId?: string;
  gameTitle?: string;
  game?: GameItem;
  onGameDelete?: (gameId: string) => void;
  onGameUpdate?: (game: any) => void;
  collectionId?: string;
  collectionTitle?: string;
  onCollectionDelete?: (collectionId: string) => void;
  onCollectionUpdate?: (collection: any) => void;
  onRemoveFromCollection?: () => void;
  showTitle?: boolean;
  subtitle?: string | number | null;
  detail?: boolean;
  play?: boolean;
  showBorder?: boolean;
  aspectRatio?: string; // e.g., "2/3" or "16/9"
  overlayContent?: React.ReactNode; // Content to overlay on the cover
  titlePosition?: "bottom" | "overlay"; // Position of title: below cover or inside image (default: "bottom")
  editButtonPosition?: "bottom-left" | "bottom-right"; // Position of edit button (default: "bottom-left")
  onUpload?: () => void; // Upload handler - shows upload button when provided
  uploading?: boolean; // Whether upload is in progress
  allCollections?: CollectionItem[];
  // Remove media props (for modal use)
  showRemoveButton?: boolean; // Show remove button (for modal use)
  removeMediaType?: "cover" | "background"; // Type of media to remove
  removeResourceId?: string | number; // Resource ID for removal
  removeResourceType?:
    | "games"
    | "collections"
    | "categories"
    | "themes"
    | "platforms"
    | "game-engines"
    | "game-modes"
    | "player-perspectives"; // Resource type for removal
  onRemoveSuccess?: () => void; // Callback when removal succeeds
  removeDisabled?: boolean; // Disable remove button
};

export default function Cover({
  title,
  coverUrl,
  width,
  height,
  onPlay,
  onClick,
  onEdit,
  onDelete,
  gameId,
  gameTitle,
  game,
  onGameDelete,
  onGameUpdate,
  collectionId,
  collectionTitle,
  onCollectionDelete,
  onCollectionUpdate,
  onRemoveFromCollection,
  showTitle = false,
  subtitle,
  detail = true,
  play = true,
  showBorder = true,
  aspectRatio = "3/4",
  overlayContent,
  titlePosition = "bottom",
  editButtonPosition = "bottom-left",
  onUpload,
  uploading = false,
  allCollections = [],
  showRemoveButton = false,
  removeMediaType,
  removeResourceId,
  removeResourceType,
  onRemoveSuccess,
  removeDisabled = false,
}: CoverProps) {
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPopupOverlay, setIsPopupOverlay] = useState(false);
  const coverRef = useRef<HTMLDivElement>(null);
  const showPlaceholder = !coverUrl || imageError;
  
  // Reset imageError when coverUrl changes
  useEffect(() => {
    setImageError(false);
  }, [coverUrl]);
  
  // Listen for dropdown menu open/close events
  useEffect(() => {
    if (!gameId && !collectionId) return;
    
    const handleDropdownOpened = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId?: string; collectionId?: string }>;
      // Only react to dropdown events for this specific game/collection Cover
      // Don't react to collection dropdown if this is a game Cover (games shouldn't highlight when collection dropdown opens)
      if (gameId && customEvent.detail?.gameId === gameId) {
        setIsDropdownOpen(true);
      } else if (collectionId && !gameId && customEvent.detail?.collectionId === collectionId) {
        // Only react to collection dropdown if this Cover represents a collection, not a game
        setIsDropdownOpen(true);
      }
    };
    
    const handleDropdownClosed = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId?: string; collectionId?: string }>;
      // Only react to dropdown events for this specific game/collection Cover
      // Don't react to collection dropdown if this is a game Cover
      if (gameId && customEvent.detail?.gameId === gameId) {
        setIsDropdownOpen(false);
      } else if (collectionId && !gameId && customEvent.detail?.collectionId === collectionId) {
        // Only react to collection dropdown if this Cover represents a collection, not a game
        setIsDropdownOpen(false);
      }
    };
    
    window.addEventListener('dropdownMenuOpened', handleDropdownOpened);
    window.addEventListener('dropdownMenuClosed', handleDropdownClosed);
    
    return () => {
      window.removeEventListener('dropdownMenuOpened', handleDropdownOpened);
      window.removeEventListener('dropdownMenuClosed', handleDropdownClosed);
    };
  }, [gameId, collectionId]);
  
  // Check if any popup or menu covers the cover buttons
  useEffect(() => {
    if (!isDropdownOpen) {
      setIsPopupOverlay(false);
      return;
    }

    const checkPopupOverlay = () => {
      if (!coverRef.current) return;
      
      const cover = coverRef.current;
      const buttons = cover.querySelectorAll('.games-list-play-button, .games-list-upload-button, .games-list-edit-button');
      
      if (buttons.length === 0) {
        setIsPopupOverlay(false);
        return;
      }
      
      // Get all popups and menus
      const popups = document.querySelectorAll('.dropdown-menu-popup, .add-to-collection-dropdown-menu');
      
      let hasOverlay = false;
      
      buttons.forEach((button) => {
        const buttonRect = button.getBoundingClientRect();
        
        popups.forEach((popup) => {
          // Check if popup is visible (not hidden)
          const popupStyle = window.getComputedStyle(popup as HTMLElement);
          if (popupStyle.display === 'none' || popupStyle.opacity === '0' || popupStyle.visibility === 'hidden') {
            return;
          }
          
          const popupRect = popup.getBoundingClientRect();
          
          // Check if popup overlaps with button
          const overlaps = !(
            popupRect.right < buttonRect.left ||
            popupRect.left > buttonRect.right ||
            popupRect.bottom < buttonRect.top ||
            popupRect.top > buttonRect.bottom
          );
          
          if (overlaps) {
            hasOverlay = true;
          }
        });
      });
      
      setIsPopupOverlay((prev) => (prev === hasOverlay ? prev : hasOverlay));
    };
    
    // Check initially and on any changes
    checkPopupOverlay();
    
    // Check periodically while dropdowns might be open
    const interval = setInterval(checkPopupOverlay, 100);
    
    // Also check on scroll and resize
    window.addEventListener('scroll', checkPopupOverlay, true);
    window.addEventListener('resize', checkPopupOverlay);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', checkPopupOverlay, true);
      window.removeEventListener('resize', checkPopupOverlay);
    };
  }, [isDropdownOpen]);
  
  // Calculate font size and padding for placeholder overlay
  let calculatedFontSize = Math.max(10, Math.min(16, Math.floor(width / 8)));
  // Increase font size for 16/9 aspect ratio with overlay title
  if (aspectRatio === "16/9" && titlePosition === "overlay") {
    calculatedFontSize = Math.max(14, Math.min(24, Math.floor(width / 5)));
  }
  const padding = Math.max(4, Math.floor(width / 20));
  const lineClamp = Math.max(2, Math.floor(height / (calculatedFontSize * 1.5)));

  const handleCoverClick = (e: React.MouseEvent) => {
    if (play && !detail && onPlay) {
      // If play only (no detail), clicking the cover plays
      e.stopPropagation(); // Prevent event from bubbling to parent
      onPlay();
    } else if (detail && onClick) {
      // If detail enabled, clicking the cover goes to detail
      e.stopPropagation(); // Prevent event from bubbling to parent
      onClick();
    }
    // If neither play nor detail, do nothing
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlay) {
      onPlay();
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  };

  const handleUploadClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpload && !uploading) {
      onUpload();
    }
  };

  const shouldShowPlayButton = play && onPlay && !onUpload;
  const shouldShowUploadButton = onUpload !== undefined;
  const isClickable = detail || play || shouldShowUploadButton;

  return (
    <>
      <div
        ref={coverRef}
        className={`games-list-cover relative bg-[#2a2a2a] rounded overflow-hidden transition-all ${showBorder ? 'cover-hover-effect' : ''} ${play ? 'games-list-cover-play' : ''} ${detail ? 'games-list-cover-detail' : ''} ${shouldShowUploadButton ? 'games-list-cover-upload' : ''} ${isDropdownOpen ? 'cover-dropdown-open' : ''} ${isPopupOverlay ? 'cover-popup-overlay' : ''}`}
        style={{ 
          width: `${width}px`, 
          aspectRatio: aspectRatio,
          cursor: isClickable && !shouldShowUploadButton ? 'pointer' : (shouldShowUploadButton ? 'pointer' : 'default')
        }}
        onClick={shouldShowUploadButton ? handleUploadClick : handleCoverClick}
      >
        {showPlaceholder ? (
          <div
            className="cover-placeholder"
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#2a2a2a",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              boxSizing: "border-box",
            }}
          >
            <div
              className="cover-placeholder-text"
              style={{
                padding: `${padding}px`,
                fontSize: `${calculatedFontSize}px`,
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.85)",
                fontWeight: 600,
                lineHeight: 1.3,
                wordBreak: "break-word",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: lineClamp,
                WebkitBoxOrient: "vertical",
                width: "100%",
                maxHeight: "100%",
              }}
            >
              {title}
            </div>
          </div>
        ) : (
          <img
            key={coverUrl || 'cover-image'}
            src={coverUrl}
            alt={title}
            className="object-cover w-full h-full"
            loading={coverUrl.startsWith('data:') ? undefined : "lazy"}
            onError={() => {
              setImageError(true);
            }}
            onLoad={() => {
              setImageError(false);
            }}
          />
        )}
        {shouldShowPlayButton && (
          <button
            onClick={handlePlayClick}
            className={`games-list-play-button ${detail ? 'games-list-play-button-detail' : 'games-list-play-button-play-only'}`}
            aria-label={t("common.play")}
          >
            <svg
              width="48"
              height="48"
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
        {shouldShowUploadButton && (
          <button
            onClick={handleUploadClick}
            className={`games-list-upload-button ${detail ? 'games-list-upload-button-detail' : 'games-list-upload-button-upload-only'}`}
            aria-label={t("gameDetail.uploadCover", "Upload Cover")}
            disabled={uploading}
          >
            {uploading ? (
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="spinning"
                style={{
                  animation: "spin 1s linear infinite"
                }}
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray="31.416"
                  strokeDashoffset="31.416"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 5v14M5 12h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        )}
        {onEdit && (
          <button
            onClick={handleEditClick}
            className={`games-list-edit-button ${editButtonPosition === "bottom-right" ? "games-list-edit-button-bottom-right" : ""}`}
            aria-label={t("common.edit", "Edit")}
          >
            <svg
              width="20"
              height="20"
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
        )}
        {onEdit && gameId && game && (
          <div className="games-list-dropdown-wrapper games-list-dropdown-wrapper-bottom-right">
            <AddToCollectionDropdown
              game={game}
              allCollections={allCollections}
            />
          </div>
        )}
        {onEdit && (gameId || collectionId) && (
          <div className="games-list-dropdown-wrapper games-list-dropdown-wrapper-bottom-right">
            {gameId && game && game.executables && game.executables.length > 1 && onPlay && (
              <AdditionalExecutablesDropdown
                gameId={gameId}
                gameExecutables={game.executables}
                onPlayExecutable={(executableName: string) => {
                  if (onPlay) {
                    (onPlay as any)(game, executableName);
                  }
                }}
              />
            )}
            <DropdownMenu
              onDelete={onDelete}
              gameId={gameId}
              gameTitle={gameTitle}
              gameExecutables={game?.executables}
              onAddToCollection={gameId && game ? () => {} : undefined}
              onRemoveFromCollection={onRemoveFromCollection}
              onGameDelete={onGameDelete}
              onGameUpdate={onGameUpdate}
              collectionId={collectionId}
              collectionTitle={collectionTitle}
              onCollectionDelete={onCollectionDelete}
              onCollectionUpdate={onCollectionUpdate}
              className="games-list-dropdown-menu"
            />
          </div>
        )}
        {showRemoveButton && removeMediaType && removeResourceId && removeResourceType && (
          <button
            className="cover-remove-media-button"
            onClick={(e) => {
              e.stopPropagation();
              if (onRemoveSuccess) {
                onRemoveSuccess();
              }
            }}
            disabled={removeDisabled || uploading}
            title={
              removeMediaType === "cover"
                ? t("gameDetail.removeCover", "Remove cover")
                : t("gameDetail.removeBackground", "Remove background")
            }
          />
        )}
        {overlayContent && (
          <div className="cover-overlay-content">
            {overlayContent}
          </div>
        )}
        {titlePosition === "overlay" && showTitle && !showPlaceholder && (
          <div className="cover-overlay-content" style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: `${padding}px`,
          }}>
            <div
              style={{
                textAlign: "center",
                color: "rgba(255, 255, 255, 0.95)",
                fontWeight: 600,
                fontSize: `${calculatedFontSize}px`,
                lineHeight: 1.3,
                wordBreak: "break-word",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: lineClamp,
                WebkitBoxOrient: "vertical",
                textShadow: "2px 2px 4px rgba(0, 0, 0, 0.8)",
              }}
            >
              {title}
            </div>
          </div>
        )}
      </div>
      {(showTitle || subtitle != null) && titlePosition === "bottom" && (
        <div className="games-list-title-wrapper">
          {showTitle && (
            <Tooltip text={title} position="bottom">
              <div 
                className={`truncate games-list-title ${detail ? "games-list-title-clickable" : ""}`}
                onClick={detail && onClick ? (e) => {
                  e.stopPropagation();
                  onClick();
                } : undefined}
              >
                {title}
              </div>
            </Tooltip>
          )}
          {subtitle != null && (
            <div className="games-list-year">{subtitle}</div>
          )}
        </div>
      )}
    </>
  );
}

