import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { CollectionItem, GameItem } from "../../types";
import AddToCollectionModal from "./AddToCollectionModal";
import { useAddGameToCollection } from "../common/actions";
import { useCollections } from "../../contexts/CollectionsContext";
import "./AddToCollectionDropdown.css";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recentCollections, setRecentCollections] = useState<CollectionItem[]>([]);
  const [isPositionReady, setIsPositionReady] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { collectionGameIds } = useCollections();
  const addGameToCollection = useAddGameToCollection({
    onSuccess: () => {
      onCollectionAdded?.();
      setIsOpen(false);
    },
  });

  // Expose method to open/close dropdown from parent
  useEffect(() => {
    const handleOpenDropdown = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId?: string }>;
      // Only open if the event is for this specific game and modal is not open
      if (customEvent.detail?.gameId === game.id && !isModalOpen) {
        setIsOpen(true);
      }
    };
    
    const handleCloseDropdown = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId?: string }>;
      // Only close if the event is for this specific game or if no gameId is specified (close all)
      // But don't close if modal is open
      if ((!customEvent.detail?.gameId || customEvent.detail.gameId === game.id) && !isModalOpen) {
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

  useEffect(() => {
    // Load recent collections from localStorage
    const recentIds = JSON.parse(
      localStorage.getItem("recentCollections") || "[]"
    ) as string[];
    
    // Only include recent collections that don't already contain this game
    const recent = recentIds
      .map((id) => availableCollections.find((c) => c.id === id))
      .filter((c): c is CollectionItem => c !== undefined)
      .slice(0, 5); // Show max 5 recent collections
    
    setRecentCollections(recent);
  }, [availableCollections]);

  // Calculate position for submenu and handle mouse leave
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) {
      setIsPositionReady(false);
      return;
    }

    setIsPositionReady(false); // Reset when opening

    const updatePosition = () => {
      const menuItem = document.querySelector('.dropdown-menu-item-with-submenu');
      if (!menuItem) return;

      const menu = dropdownRef.current?.querySelector('.add-to-collection-dropdown-menu') as HTMLElement;
      if (!menu) return;

      const rect = menuItem.getBoundingClientRect();
      const spacing = 0; // No spacing to prevent gap that causes mouse leave
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = 8; // Padding from screen edges

      // Get menu dimensions - use offsetWidth/offsetHeight as they're more reliable
      const menuWidth = menu.offsetWidth || 200; // fallback to min-width
      const menuHeight = menu.offsetHeight || 100; // fallback estimate

      // Calculate horizontal position (prefer right side)
      let left = rect.right + spacing;
      
      // Check if menu would overflow on the right
      if (left + menuWidth + padding > viewportWidth) {
        // Position to the left of the menu item
        left = rect.left - menuWidth - spacing;
        // If still overflowing on the left, align to left edge with padding
        if (left < padding) {
          left = padding;
        }
      } else if (left < padding) {
        // If too close to left edge, add padding
        left = padding;
      }

      // Calculate vertical position (align top of submenu with bottom of menu item)
      // This positions the submenu lower, starting from the bottom of the menu item
      let top = rect.bottom;
      
      // Check if menu would overflow on the bottom
      if (top + menuHeight + padding > viewportHeight) {
        // If menu would overflow, align bottom of menu with bottom of menu item
        top = rect.bottom - menuHeight;
        // If still overflowing, align to bottom edge with padding
        if (top + menuHeight + padding > viewportHeight) {
          top = viewportHeight - menuHeight - padding;
        }
      }
      
      // Check if menu would overflow on the top
      if (top < padding) {
        top = padding;
      }

      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      
      // Mark position as ready after applying styles
      setIsPositionReady(true);
    };

    // Initial position calculation - use requestAnimationFrame to ensure menu is rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(updatePosition);
    });

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
  }, [isOpen]);

  const handleCollectionClick = async (e: React.MouseEvent, collectionId: string) => {
    e.stopPropagation();
    e.preventDefault();
    // Close submenu first
    setIsOpen(false);
    // Then add to collection
    await addGameToCollection.addGameToCollection(game.id, collectionId);
  };

  const handleAddToCollectionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Close submenu first
    setIsOpen(false);
    // Use setTimeout to ensure the dropdown closes before opening the modal
    setTimeout(() => {
      setIsModalOpen(true);
    }, 50);
  };

  return (
    <>
      <div className="add-to-collection-dropdown" ref={dropdownRef}>
        {isOpen && (
          <div 
            className="add-to-collection-dropdown-menu"
            style={{ opacity: isPositionReady ? 1 : 0, pointerEvents: isPositionReady ? 'auto' : 'none' }}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={(e) => {
              // Don't close if mouse is moving to another menu item or the main dropdown
              const relatedTarget = e.relatedTarget as HTMLElement;
              if (!relatedTarget || (!relatedTarget.closest('.add-to-collection-dropdown-menu') && !relatedTarget.closest('.dropdown-menu-item-with-submenu') && !relatedTarget.closest('.dropdown-menu-popup'))) {
                // Use a delay to allow mouse to reach submenu
                setTimeout(() => {
                  // Check if mouse is still over menu item or submenu
                  const menuItem = document.querySelector('.dropdown-menu-item-with-submenu');
                  const submenu = dropdownRef.current?.querySelector('.add-to-collection-dropdown-menu');
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
              onClick={handleAddToCollectionClick}
            >
              {t("collections.addToCollection", "Add to Collection...")}
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
        )}
      </div>

      <AddToCollectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        game={game}
        allCollections={allCollections}
        onCollectionAdded={onCollectionAdded}
      />
    </>
  );
}

