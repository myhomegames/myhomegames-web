import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import type { CollectionItem, GameItem } from "../../types";
import AddToCollectionLikeModal, { type AddToResourceType } from "./AddToCollectionLikeModal";
import { useAddGameToCollection } from "../common/actions";
import { useCollections } from "../../contexts/CollectionsContext";
import { applyPortaledSubmenuPosition } from "../../utils/clampPortaledSubmenuPosition";
type AddToCollectionDropdownProps = {
  game: GameItem;
  allCollections: CollectionItem[];
  onCollectionAdded?: () => void;
};

export default function AddToCollectionDropdown({
  game,
  allCollections,
  onCollectionAdded,
}: AddToCollectionDropdownProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [modalResourceType, setModalResourceType] = useState<AddToResourceType | null>(null);
  const [isPositionReady, setIsPositionReady] = useState(false);
  const [shouldUsePortal, setShouldUsePortal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuItemRef = useRef<HTMLElement | null>(null);
  const { collectionGameIds } = useCollections();
  const isModalOpen = modalResourceType !== null;
  const addGameToCollection = useAddGameToCollection({
    onSuccess: () => {
      onCollectionAdded?.();
      setIsOpen(false);
    },
  });

  // Expose method to open/close dropdown from parent
  useEffect(() => {
    const handleOpenDropdown = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId?: string; menuItem?: HTMLElement }>;
      // Only open if the event is for this specific game and modal is not open
      if (String(customEvent.detail?.gameId ?? "") === String(game.id) && !isModalOpen) {
        // Store the menu item reference if provided
        if (customEvent.detail.menuItem) {
          menuItemRef.current = customEvent.detail.menuItem;
        } else {
          // Fallback: try to find the menu item
          const menuItems = document.querySelectorAll('.dropdown-menu-item-with-submenu');
          for (const item of menuItems) {
            const popup = item.closest('.dropdown-menu-popup');
            if (popup) {
              const style = window.getComputedStyle(popup as HTMLElement);
              if (style.display !== 'none' && style.visibility !== 'hidden') {
                menuItemRef.current = item as HTMLElement;
                break;
              }
            }
          }
        }
        setIsOpen(true);
      }
    };
    
    const handleCloseDropdown = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId?: string }>;
      // Only close if the event is for this specific game or if no gameId is specified (close all)
      // But don't close if modal is open
      if (
        (!customEvent.detail?.gameId || String(customEvent.detail.gameId) === String(game.id)) &&
        !isModalOpen
      ) {
        setIsOpen(false);
      }
    };
    
    // Listen for custom events to open/close dropdown
    window.addEventListener('openAddToCollectionDropdown', handleOpenDropdown);
    window.addEventListener('closeAddToCollectionDropdown', handleCloseDropdown);
    
    return () => {
      window.removeEventListener('openAddToCollectionDropdown', handleOpenDropdown);
      window.removeEventListener('closeAddToCollectionDropdown', handleCloseDropdown);
    };
  }, [game.id, isModalOpen]);

  // Filter out collections that already contain this game
  const availableCollections = useMemo(() => {
    return allCollections.filter((collection) => {
      const gameIds = collectionGameIds.get(String(collection.id));
      return !gameIds || !gameIds.includes(String(game.id));
    });
  }, [allCollections, collectionGameIds, game.id]);

  const recentCollections = useMemo(() => {
    // Load recent collections from localStorage
    const recentIds = JSON.parse(
      localStorage.getItem("recentCollections") || "[]"
    ) as string[];

    // Only include recent collections that don't already contain this game
    return recentIds
      .map((id) => availableCollections.find((c) => c.id === id))
      .filter((c): c is CollectionItem => c !== undefined)
      .slice(0, 5); // Show max 5 recent collections
  }, [availableCollections]);

  // Always use portal for submenus to avoid issues with virtualized lists
  // The submenu needs to be outside the virtualized container to work correctly
  useEffect(() => {
    // Always use portal when submenu is open
    setShouldUsePortal(isOpen);
  }, [isOpen]);

  // Calculate position for submenu and handle mouse leave
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) {
      setIsPositionReady(false);
      return;
    }

    setIsPositionReady(false); // Reset when opening

    const updatePosition = () => {
      // Use the stored menu item reference first
      let menuItem: HTMLElement | null = menuItemRef.current;
      
      // If not stored or the stored item is no longer valid, find it
      if (!menuItem || !document.contains(menuItem)) {
        // Find all menu items with submenu
        const menuItems = document.querySelectorAll('.dropdown-menu-item-with-submenu');
        
        // Find the one within a visible popup (should only be one visible at a time)
        for (const item of menuItems) {
          const popup = item.closest('.dropdown-menu-popup');
          if (popup) {
            const style = window.getComputedStyle(popup as HTMLElement);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              menuItem = item as HTMLElement;
              menuItemRef.current = menuItem; // Store for next time
              break;
            }
          }
        }
      }
      
      // Final fallback
      if (!menuItem) {
        menuItem = document.querySelector('.dropdown-menu-item-with-submenu') as HTMLElement;
      }
      
      if (!menuItem) return;

      // When using portal, the menu is in document.body, not in dropdownRef
      const menu = menuRef.current;
      if (!menu) {
        requestAnimationFrame(updatePosition);
        return;
      }

      const rect = menuItem.getBoundingClientRect();
      applyPortaledSubmenuPosition(menu, rect);

      // Re-clamp after layout with the measured width (long labels widen the menu).
      requestAnimationFrame(() => {
        if (menuRef.current && menuItem.isConnected) {
          applyPortaledSubmenuPosition(menuRef.current, menuItem.getBoundingClientRect());
          setIsPositionReady(true);
        }
      });
      return;
    };

    // Initial position calculation - use requestAnimationFrame to ensure menu is rendered
    // When using portal, need more delay to ensure the menu is in the DOM
    if (shouldUsePortal) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(() => {
            updatePosition();
          }, 50); // Extra delay for portal rendering
        });
      });
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(updatePosition);
      });
    }

    // Update position on resize and scroll (but don't reset isPositionReady)
    const handleResize = () => {
      updatePosition();
    };
    
    const handleScroll = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    function handleMouseLeave(event: MouseEvent) {
      const target = event.target as HTMLElement;
      // Don't close if mouse is moving to the dropdown menu itself
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        // Also check if mouse is still over the dropdown menu item that triggered this
        if (!target.closest('.dropdown-menu-item-with-submenu') && !target.closest('.dropdown-menu-popup')) {
          setIsOpen(false);
        }
      }
    }

    // Use mouseleave instead of click outside for hover behavior
    if (dropdownRef.current) {
      dropdownRef.current.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
      if (dropdownRef.current) {
        dropdownRef.current.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [isOpen, shouldUsePortal]);

  const handleCollectionClick = async (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    // Close submenu first
    setIsOpen(false);
    // Then add to collection
    await addGameToCollection.addGameToCollection(game.id, collectionId);
  };

  const handleOpenModal = (resourceType: AddToResourceType) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent("mhg:close-dropdown-menus"));
    setTimeout(() => setModalResourceType(resourceType), 50);
  };

  const submenuContent = isOpen ? (
    <div
      ref={menuRef}
      className={`add-to-collection-dropdown-menu add-to-collection-dropdown-menu--positioning${isPositionReady ? " is-position-ready" : ""}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={(e) => {
        // Don't close if mouse is moving to another menu item or the main dropdown
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (!relatedTarget || (!relatedTarget.closest('.add-to-collection-dropdown-menu') && !relatedTarget.closest('.dropdown-menu-item-with-submenu') && !relatedTarget.closest('.dropdown-menu-popup'))) {
          // Use a delay to allow mouse to reach submenu
          setTimeout(() => {
            // Check if mouse is still over menu item or submenu
            const menuItem = document.querySelector('.dropdown-menu-item-with-submenu');
            const submenu = document.querySelector('.add-to-collection-dropdown-menu');
            if (menuItem && submenu) {
              const menuRect = menuItem.getBoundingClientRect();
              const submenuRect = submenu.getBoundingClientRect();
              const mouseX = e.clientX;
              const mouseY = e.clientY;
              const isOverMenuItem = mouseX >= menuRect.left && mouseX <= menuRect.right &&
                                    mouseY >= menuRect.top && mouseY <= menuRect.bottom;
              const isOverSubmenu = mouseX >= submenuRect.left && mouseX <= submenuRect.right &&
                                  mouseY >= submenuRect.top && mouseY <= submenuRect.bottom;
              if (!isOverMenuItem && !isOverSubmenu) {
                setIsOpen(false);
              }
            } else {
              setIsOpen(false);
            }
          }, 200);
        }
      }}
      onClick={(e) => {
        // Prevent click from propagating to close the main dropdown
        e.stopPropagation();
      }}
    >
      <div
        className="add-to-collection-dropdown-item"
        onClick={handleOpenModal("collections")}
      >
        {t("collections.addToCollection", "Add to Collection...")}
      </div>
      <div
        className="add-to-collection-dropdown-item"
        onClick={handleOpenModal("developers")}
      >
        {t("catalogInfo.addToDeveloper", "Add to Developer...")}
      </div>
      <div
        className="add-to-collection-dropdown-item"
        onClick={handleOpenModal("publishers")}
      >
        {t("catalogInfo.addToPublisher", "Add to Publisher...")}
      </div>

      {recentCollections.length > 0 && (
        <>
          <div className="add-to-collection-dropdown-divider" />
          <div className="add-to-collection-dropdown-section-title">
            {t("collections.recent", "RECENT")}
          </div>
          {recentCollections.map((collection) => (
            <div
              key={collection.id}
              className="add-to-collection-dropdown-item"
              onClick={(e) => handleCollectionClick(e, collection.id)}
            >
              {collection.title}
            </div>
          ))}
        </>
      )}
    </div>
  ) : null;

  return (
    <>
      <div className="add-to-collection-dropdown" ref={dropdownRef}>
        {shouldUsePortal && submenuContent ? createPortal(submenuContent, document.body) : submenuContent}
      </div>

      {modalResourceType && (
        <AddToCollectionLikeModal
          isOpen={true}
          onClose={() => setModalResourceType(null)}
          game={game}
          resourceType={modalResourceType}
          onAdded={onCollectionAdded}
        />
      )}
    </>
  );
}

