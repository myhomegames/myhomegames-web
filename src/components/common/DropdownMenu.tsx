import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { getApiToken } from "../../config";
import { useDeleteGame, useReloadGame, useUnlinkExecutable, useRemoveGameFromCollection } from "./actions";
import Tooltip from "./Tooltip";
import "./DropdownMenu.css";

type DropdownMenuProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  onReload?: () => void;
  onAddToCollection?: () => void;
  onRemoveFromCollection?: () => void;
  onManageInstallation?: () => void;
  gameId?: string;
  gameTitle?: string;
  gameExecutables?: string[] | null;
  onGameDelete?: (gameId: string) => void;
  onGameUpdate?: (game: any) => void;
  collectionId?: string;
  collectionTitle?: string;
  onCollectionDelete?: (collectionId: string) => void;
  onCollectionUpdate?: (collection: any) => void;
  developerId?: string;
  publisherId?: string;
  onRemoveFromDeveloper?: () => void;
  onRemoveFromPublisher?: () => void;
  className?: string;
  horizontal?: boolean;
  onModalOpen?: () => void;
  onModalClose?: () => void;
  toolTipDelay?: number;
};

export default function DropdownMenu({
  onEdit,
  onDelete,
  onReload,
  onAddToCollection,
  onRemoveFromCollection,
  onManageInstallation,
  gameId,
  gameTitle,
  gameExecutables,
  onGameDelete,
  onGameUpdate,
  collectionId,
  collectionTitle,
  onCollectionDelete,
  onCollectionUpdate,
  developerId,
  publisherId,
  onRemoveFromDeveloper,
  onRemoveFromPublisher,
  className = "",
  horizontal = false,
  onModalOpen,
  onModalClose,
  toolTipDelay = 0,
}: DropdownMenuProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Use action hooks
  const deleteGame = useDeleteGame({
    gameId,
    collectionId,
    onGameDelete,
    onCollectionDelete,
    onModalClose,
  });

  const reloadGame = useReloadGame({
    gameId,
    collectionId,
    onGameUpdate,
    onCollectionUpdate,
    onReload,
    onModalClose,
  });

  const unlinkExecutable = gameId && onGameUpdate
    ? useUnlinkExecutable({
        gameId,
        onGameUpdate,
      })
    : { isUnlinking: false, handleUnlinkExecutable: async () => {} };

  // Use remove game from collection hook when we're in a collection detail context
  const removeGameFromCollection = useRemoveGameFromCollection({
    onSuccess: () => {
      if (onRemoveFromCollection) {
        onRemoveFromCollection();
      }
    },
    onError: (error) => {
      console.error("Error removing game from collection:", error);
    },
  });
  
  // Check if we're in a cover (grid list) to use portal
  const isInCover = className.includes('games-list-dropdown-menu');
  // Check if we're in the games table (virtualized or not) - use portal to escape overflow and stay on top
  const isInGamesTable = className.includes('games-table-dropdown-menu');
  
  // Check if we're in search (popup or results page) to use portal so menu isn't clipped and clicks work
  const [isInSearchDropdown, setIsInSearchDropdown] = useState(false);
  
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const inSearchScroll = !!menuRef.current.closest('.search-dropdown-scroll');
      const inSearchResultsList = menuRef.current.classList.contains('search-result-dropdown-menu');
      setIsInSearchDropdown(inSearchScroll || inSearchResultsList);
    } else {
      setIsInSearchDropdown(false);
    }
  }, [isOpen]);

  // Close submenu when main dropdown closes
  useEffect(() => {
    if (!isOpen && gameId) {
      // Close submenu when main dropdown closes
      window.dispatchEvent(new CustomEvent('closeAddToCollectionDropdown', {
        detail: { gameId: gameId }
      }));
      window.dispatchEvent(new CustomEvent('closeAdditionalExecutablesDropdown', {
        detail: { gameId: gameId }
      }));
      // Dispatch event to notify cover that dropdown is closed
      window.dispatchEvent(new CustomEvent('dropdownMenuClosed', {
        detail: { gameId: gameId }
      }));
    } else if (!isOpen && collectionId) {
      // Dispatch event to notify cover that dropdown is closed
      window.dispatchEvent(new CustomEvent('dropdownMenuClosed', {
        detail: { collectionId: collectionId }
      }));
    }
  }, [isOpen, gameId, collectionId]);

  useEffect(() => {
    if (!isOpen) return;
    
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      
      // Check if click is on the menu button itself
      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }
      
      // Check if click is on the popup
      if (popupRef.current && popupRef.current.contains(target)) {
        return;
      }
      
      // Also check by class name
      if (target.closest('.dropdown-menu-popup')) {
        return;
      }
      
      // Don't close if click is on the add-to-collection dropdown menu
      if (target.closest('.add-to-collection-dropdown-menu')) {
        return;
      }
      
      // Don't close if click is on the additional-executables dropdown menu
      if (target.closest('.additional-executables-dropdown-menu')) {
        return;
      }
      
      // Otherwise, close the dropdown
      setIsOpen(false);
    }

    // Use a delay to avoid immediate closure when opening
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside, true);
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isOpen]);

  // Block body scroll when modal is open
  useEffect(() => {
    if (deleteGame.showConfirmModal || reloadGame.showReloadConfirmModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [deleteGame.showConfirmModal, reloadGame.showReloadConfirmModal]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!deleteGame.showConfirmModal && !reloadGame.showReloadConfirmModal) return;
    
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (deleteGame.showConfirmModal) {
          deleteGame.handleCancelDelete();
        }
        if (reloadGame.showReloadConfirmModal) {
          reloadGame.handleCancelReload();
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [deleteGame.showConfirmModal, reloadGame.showReloadConfirmModal, deleteGame, reloadGame]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    // Dispatch custom event to notify cover about dropdown state
    if (gameId) {
      if (newIsOpen) {
        window.dispatchEvent(new CustomEvent('dropdownMenuOpened', {
          detail: { gameId: gameId }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('dropdownMenuClosed', {
          detail: { gameId: gameId }
        }));
      }
    } else if (collectionId) {
      if (newIsOpen) {
        window.dispatchEvent(new CustomEvent('dropdownMenuOpened', {
          detail: { collectionId: collectionId }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('dropdownMenuClosed', {
          detail: { collectionId: collectionId }
        }));
      }
    }
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    if (onModalOpen) {
      onModalOpen();
    }
    if (onEdit) {
      onEdit();
    }
  };

  const handleAddToCollectionMouseEnter = (e: React.MouseEvent) => {
    // Find the menu item element
    const menuItem = e.currentTarget as HTMLElement;
    // Dispatch event to open AddToCollectionDropdown on hover with gameId and menu item reference
    window.dispatchEvent(new CustomEvent('openAddToCollectionDropdown', {
      detail: { gameId: gameId, menuItem: menuItem }
    }));
  };

  const handleAddToCollectionMouseLeave = (e: React.MouseEvent) => {
    // Check if mouse is moving to the submenu
    const target = e.relatedTarget as HTMLElement;
    if (target && !target.closest('.add-to-collection-dropdown-menu')) {
      // Mouse is not moving to submenu, close it
      window.dispatchEvent(new CustomEvent('closeAddToCollectionDropdown', {
        detail: { gameId: gameId }
      }));
    }
  };

  const handleOtherMenuItemMouseEnter = () => {
    // Close submenu when hovering over other menu items
    window.dispatchEvent(new CustomEvent('closeAddToCollectionDropdown', {
      detail: { gameId: gameId }
    }));
    window.dispatchEvent(new CustomEvent('closeAdditionalExecutablesDropdown', {
      detail: { gameId: gameId }
    }));
  };

  const handleAdditionalExecutablesMouseEnter = () => {
    // Dispatch event to open AdditionalExecutablesDropdown on hover with gameId
    window.dispatchEvent(new CustomEvent('openAdditionalExecutablesDropdown', {
      detail: { gameId: gameId }
    }));
  };

  const handleAdditionalExecutablesMouseLeave = (e: React.MouseEvent) => {
    // Check if mouse is moving to the submenu
    const target = e.relatedTarget as HTMLElement;
    if (target && !target.closest('.additional-executables-dropdown-menu')) {
      window.dispatchEvent(new CustomEvent('closeAdditionalExecutablesDropdown', {
        detail: { gameId: gameId }
      }));
    }
  };

  const handlePopupMouseLeave = (e: React.MouseEvent) => {
    // Close submenu when mouse leaves the dropdown popup
    const target = e.relatedTarget as HTMLElement;
    if (target && !target.closest('.dropdown-menu-popup') && !target.closest('.add-to-collection-dropdown-menu')) {
      window.dispatchEvent(new CustomEvent('closeAddToCollectionDropdown', {
        detail: { gameId: gameId }
      }));
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    
    // If we have props to handle deletion internally (game or collection)
    if ((gameId && gameTitle) || (collectionId && collectionTitle)) {
      if (onModalOpen) {
        onModalOpen();
      }
      deleteGame.handleDeleteClick();
    } else if (onDelete) {
      // Fallback to previous behavior
      onDelete();
    }
  };

  const handleReload = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    
    // If there's a gameId or collectionId, execute reload directly (single element)
    if (gameId || collectionId) {
      if (onReload) {
        // If there's a custom callback, use it
        onReload();
      } else {
        reloadGame.handleConfirmReload();
      }
      return;
    }
    
    // Otherwise show confirmation modal for global reload
    // Use setTimeout to ensure dropdown is closed before opening modal
    setTimeout(() => {
      if (onModalOpen) {
        onModalOpen();
      }
      reloadGame.handleReloadClick();
    }, 0);
  };

  const handleUnlinkExecutableClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(false);
    await unlinkExecutable.handleUnlinkExecutable();
  };

  const buttonContent = (
    <button
      onClick={handleToggle}
      className="dropdown-menu-button"
      aria-label="Menu"
    >
      {horizontal ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="5" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="19" cy="12" r="1" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      )}
    </button>
  );

  return (
    <div className={`dropdown-menu-wrapper ${className}`} ref={menuRef}>
      {toolTipDelay > 0 ? (
        <Tooltip text={t("common.more", "More")} delay={toolTipDelay}>
          {buttonContent}
        </Tooltip>
      ) : (
        buttonContent
      )}
      {isOpen && (() => {
        const popupContent = (
          <div 
            ref={popupRef} 
            className={`dropdown-menu-popup ${isInSearchDropdown ? 'dropdown-menu-popup-in-search' : ''} ${isInGamesTable ? 'dropdown-menu-popup-in-games-table' : ''}`}
            onMouseLeave={handlePopupMouseLeave}
            style={(() => {
              if (!menuRef.current) return undefined;
              
              // Only apply fixed positioning for cover or search dropdown
              if (isInCover) {
                const rect = menuRef.current.getBoundingClientRect();
                return {
                  position: 'fixed',
                  bottom: `${window.innerHeight - rect.top + 4}px`,
                  right: `${window.innerWidth - rect.right}px`,
                  top: 'auto',
                };
              }
              
              if (isInSearchDropdown) {
                const rect = menuRef.current.getBoundingClientRect();
                return {
                  position: 'fixed',
                  top: `${rect.bottom + 4}px`,
                  right: `${window.innerWidth - rect.right}px`,
                  zIndex: 10007,
                };
              }
              
              if (isInGamesTable) {
                const rect = menuRef.current.getBoundingClientRect();
                return {
                  position: 'fixed',
                  top: `${rect.bottom + 4}px`,
                  right: `${window.innerWidth - rect.right}px`,
                  left: 'auto',
                  zIndex: 10002,
                };
              }
              
              // Normal positioning (absolute) for other cases
              return undefined;
            })()}
          >
            {/* Additional Executables (only for games with multiple executables) */}
            {gameId && gameExecutables && gameExecutables.length > 1 && (
              <div
                className="dropdown-menu-item dropdown-menu-item-with-submenu additional-executables-menu-item"
                onMouseEnter={handleAdditionalExecutablesMouseEnter}
                onMouseLeave={handleAdditionalExecutablesMouseLeave}
              >
                <span>{t("gameDetail.additionalExecutables", "Additional executables")}</span>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            )}

            {/* First Section: Add to Collection */}
            {onAddToCollection && (
              <>
                <div
                  className="dropdown-menu-item dropdown-menu-item-with-submenu"
                  onMouseEnter={handleAddToCollectionMouseEnter}
                  onMouseLeave={handleAddToCollectionMouseLeave}
                >
                  <span>{t("collections.addTo", "Add to")}</span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </>
            )}
            
            {/* Manage Installation (only for games) */}
            {gameId && onManageInstallation && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  if (onManageInstallation) {
                    onManageInstallation();
                  }
                }}
                className="dropdown-menu-item"
              >
                <span>{t("manageInstallation.title", "Manage Installation")}</span>
              </button>
            )}
            
            {/* Divider after Additional Executables / Add to Collection / Manage Installation */}
            {((gameId && gameExecutables && gameExecutables.length > 1) || onAddToCollection || (gameId && onManageInstallation)) && !(onRemoveFromCollection && gameId && collectionId) && (onEdit || (onReload || (gameId && onGameUpdate) || (!gameId && !collectionId && !onEdit && !onDelete)) || (gameId && gameExecutables && gameExecutables.length > 0 && onGameUpdate) || (onDelete || (getApiToken() && (gameId || collectionId)))) && (
              <div 
                className="dropdown-menu-divider"
                onMouseEnter={handleOtherMenuItemMouseEnter}
              />
            )}
            
            {/* Second Section: Remove from Collection / Developer / Publisher */}
            {onRemoveFromCollection && gameId && collectionId && (
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  await removeGameFromCollection.removeGameFromCollection(gameId, collectionId);
                }}
                className="dropdown-menu-item dropdown-menu-item-danger"
                disabled={removeGameFromCollection.isRemoving}
              >
                <span>
                  {removeGameFromCollection.isRemoving
                    ? t("common.removing", "Removing...")
                    : t("collections.removeFromCollection", "Remove from collection")
                  }
                </span>
              </button>
            )}
            {onRemoveFromDeveloper && gameId && developerId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onRemoveFromDeveloper?.();
                }}
                className="dropdown-menu-item dropdown-menu-item-danger"
              >
                <span>{t("igdbInfo.removeFromDeveloper", "Remove from developer")}</span>
              </button>
            )}
            {onRemoveFromPublisher && gameId && publisherId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onRemoveFromPublisher?.();
                }}
                className="dropdown-menu-item dropdown-menu-item-danger"
              >
                <span>{t("igdbInfo.removeFromPublisher", "Remove from publisher")}</span>
              </button>
            )}
            {((onRemoveFromCollection && gameId && collectionId) || (onRemoveFromDeveloper && gameId && developerId) || (onRemoveFromPublisher && gameId && publisherId)) && (onEdit || (onReload || (gameId && onGameUpdate) || (!gameId && !collectionId && !onEdit && !onDelete)) || (gameId && gameExecutables && gameExecutables.length > 0 && onGameUpdate) || (onDelete || (getApiToken() && (gameId || collectionId)))) && (
              <div className="dropdown-menu-divider" />
            )}
            
            {/* Third Section: Edit, Reload, Unlink, Delete */}
            {onEdit && (
              <button
                onClick={handleEdit}
                className="dropdown-menu-item"
              >
                <span>{t("common.edit", "Edit")}</span>
              </button>
            )}
            {(onReload || (gameId && onGameUpdate) || (!gameId && !collectionId && !onEdit && !onDelete)) && (
              <button
                onClick={handleReload}
                className="dropdown-menu-item"
                disabled={reloadGame.isReloading}
              >
                <span>
                  {gameId
                    ? t("common.reloadSingleMetadata", "Reload metadata")
                    : t("common.reloadMetadata", "Reload all metadata")
                  }
                </span>
              </button>
            )}
            {gameId && gameExecutables && gameExecutables.length > 0 && onGameUpdate && (
              <button
                onClick={handleUnlinkExecutableClick}
                className="dropdown-menu-item"
                disabled={unlinkExecutable.isUnlinking}
              >
                <span>
                  {gameExecutables.length > 1
                    ? t("gameDetail.unlinkAllExecutables", "Unlink All Executables")
                    : t("gameDetail.unlinkExecutable", "Unlink Executable")}
                </span>
              </button>
            )}
            {(onDelete || (getApiToken() && (gameId || collectionId))) && (
              <button
                onClick={handleDeleteClick}
                className="dropdown-menu-item dropdown-menu-item-danger"
              >
                <span>{t("common.delete", "Delete")}</span>
              </button>
            )}
          </div>
        );
        
        // Use portal for search dropdown, cover, or games table (escape overflow and stay on top)
        return (isInSearchDropdown || isInCover || isInGamesTable) ? createPortal(popupContent, document.body) : popupContent;
      })()}

      {/* Reload Confirmation Modal */}
      {reloadGame.showReloadConfirmModal && createPortal(
        <div className="dropdown-menu-confirm-overlay" onClick={reloadGame.handleCancelReload}>
          <div className="dropdown-menu-confirm-container" onClick={(e) => e.stopPropagation()}>
            <div className="dropdown-menu-confirm-header">
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
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
                {t("common.reloadMetadata", "Reload all metadata")}
              </h2>
              <button
                className="dropdown-menu-confirm-close"
                onClick={reloadGame.handleCancelReload}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="dropdown-menu-confirm-content">
              <p>{t("common.confirmReload", "Are you sure you want to reload all metadata? This will refresh all games, collections, and categories.")}</p>
              {reloadGame.reloadError && (
                <div className="dropdown-menu-confirm-error">{reloadGame.reloadError}</div>
              )}
            </div>
            <div className="dropdown-menu-confirm-footer">
              <button
                className="dropdown-menu-confirm-cancel"
                onClick={reloadGame.handleCancelReload}
                disabled={reloadGame.isReloading}
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                className="dropdown-menu-confirm-reload"
                onClick={reloadGame.handleConfirmReload}
                disabled={reloadGame.isReloading}
              >
                {reloadGame.isReloading ? t("common.reloading", "Reloading...") : t("common.reloadMetadata", "Reload all metadata")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {deleteGame.showConfirmModal && createPortal(
        <div className="dropdown-menu-confirm-overlay" onClick={deleteGame.handleCancelDelete}>
          <div className="dropdown-menu-confirm-container" onClick={(e) => e.stopPropagation()}>
            <div className="dropdown-menu-confirm-header">
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
                  <path d="M3 6h18" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                {t("common.deleteTitle", "Delete")}
              </h2>
              <button
                className="dropdown-menu-confirm-close"
                onClick={deleteGame.handleCancelDelete}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="dropdown-menu-confirm-content">
              <p>{t("common.confirmDelete", { title: gameTitle || collectionTitle || "" })}</p>
              {deleteGame.deleteError && (
                <div className="dropdown-menu-confirm-error">{deleteGame.deleteError}</div>
              )}
            </div>
            <div className="dropdown-menu-confirm-footer">
              <button
                className="dropdown-menu-confirm-cancel"
                onClick={deleteGame.handleCancelDelete}
                disabled={deleteGame.isDeleting}
              >
                {t("common.cancel", "Cancel")}
              </button>
              <button
                className="dropdown-menu-confirm-delete"
                onClick={deleteGame.handleConfirmDelete}
                disabled={deleteGame.isDeleting}
              >
                {deleteGame.isDeleting ? t("common.deleting", "Deleting...") : t("common.delete", "Delete")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

