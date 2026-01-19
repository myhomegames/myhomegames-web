import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import "./AdditionalExecutablesDropdown.css";

type AdditionalExecutablesDropdownProps = {
  gameId: string;
  gameExecutables: string[];
  onPlayExecutable: (executableName: string) => void;
};

export default function AdditionalExecutablesDropdown({
  gameId,
  gameExecutables,
  onPlayExecutable,
}: AdditionalExecutablesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPositionReady, setIsPositionReady] = useState(false);
  const [isInSearchPopup, setIsInSearchPopup] = useState(false);
  const [shouldUsePortal, setShouldUsePortal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Exclude the first executable (it's used by the Play button)
  const additionalExecutables = gameExecutables.slice(1);

  // Check if we're inside a search dropdown (popup context)
  useEffect(() => {
    if (dropdownRef.current) {
      const inPopup = dropdownRef.current.closest('.search-dropdown-item') !== null;
      setIsInSearchPopup(inPopup);
    }
  }, []);

  // Always use portal for submenus to avoid issues with virtualized lists
  // The submenu needs to be outside the virtualized container to work correctly
  useEffect(() => {
    // Always use portal when submenu is open (except for search popup which already uses portal)
    setShouldUsePortal(isOpen);
  }, [isOpen]);

  // Expose method to open/close dropdown from parent
  useEffect(() => {
    const handleOpenDropdown = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId?: string }>;
      // Only open if the event is for this specific game
      if (customEvent.detail?.gameId === gameId) {
        setIsOpen(true);
      }
    };

    const handleCloseDropdown = (event: Event) => {
      const customEvent = event as CustomEvent<{ gameId?: string }>;
      // Only close if the event is for this specific game or if no gameId is specified (close all)
      if (!customEvent.detail?.gameId || customEvent.detail.gameId === gameId) {
        setIsOpen(false);
      }
    };

    // Listen for custom events to open/close dropdown
    window.addEventListener('openAdditionalExecutablesDropdown', handleOpenDropdown);
    window.addEventListener('closeAdditionalExecutablesDropdown', handleCloseDropdown);

    return () => {
      window.removeEventListener('openAdditionalExecutablesDropdown', handleOpenDropdown);
      window.removeEventListener('closeAdditionalExecutablesDropdown', handleCloseDropdown);
    };
  }, [gameId]);

  // Calculate position for submenu and handle mouse leave
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) {
      setIsPositionReady(false);
      return;
    }

    setIsPositionReady(false); // Reset when opening

    const updatePosition = () => {
      const menuItem = document.querySelector('.dropdown-menu-item-with-submenu.additional-executables-menu-item');
      if (!menuItem) {
        // Retry if menu item not found yet
        requestAnimationFrame(updatePosition);
        return;
      }

      // When using portal, the menu is in document.body, not in dropdownRef
      let menu = shouldUsePortal
        ? (document.querySelector('.additional-executables-dropdown-menu') as HTMLElement)
        : (menuRef.current as HTMLElement);
      if (!menu && dropdownRef.current && !shouldUsePortal) {
        menu = dropdownRef.current.querySelector('.additional-executables-dropdown-menu') as HTMLElement;
      }
      if (!menu) {
        // Retry if menu not found yet
        requestAnimationFrame(updatePosition);
        return;
      }

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

      // Calculate vertical position (align top of submenu with top of menu item)
      let top = rect.top;
      
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

      menu.style.position = 'fixed';
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
      menu.style.right = 'auto';
      menu.style.bottom = 'auto';

      setIsPositionReady(true);
    };

    // Initial position calculation - use double requestAnimationFrame to ensure menu is rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(updatePosition);
    });

    // Update position on resize and scroll
    const handleResize = () => {
      updatePosition();
    };
    
    const handleScroll = () => {
      updatePosition();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen]);

  const handleExecutableClick = (e: React.MouseEvent, executableName: string) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Call onPlayExecutable immediately - don't delay it
    if (onPlayExecutable) {
      onPlayExecutable(executableName);
    }
    
    // Close menu after calling onPlayExecutable
    // Use a small delay to ensure onPlayExecutable is processed before closing
    setTimeout(() => {
      setIsOpen(false);
    }, 50);
  };

  if (additionalExecutables.length === 0) {
    return null;
  }

  const menuContent = isOpen ? (
    <div
      ref={menuRef}
      className={`additional-executables-dropdown-menu ${isInSearchPopup ? 'additional-executables-dropdown-menu-in-popup' : ''}`}
      style={{
        visibility: isPositionReady ? 'visible' : 'hidden',
        pointerEvents: isPositionReady ? 'auto' : 'none',
      }}
          onMouseLeave={(e) => {
            // Use setTimeout to delay closing to allow moving to menu item
            setTimeout(() => {
              const menuItem = document.querySelector('.dropdown-menu-item-with-submenu.additional-executables-menu-item');
              if (menuItem) {
                const menuRect = menuItem.getBoundingClientRect();
                // Try menuRef first, then fallback to querySelector
                let submenu: HTMLElement | null = menuRef.current;
                if (!submenu && dropdownRef.current) {
                  submenu = dropdownRef.current.querySelector('.additional-executables-dropdown-menu') as HTMLElement;
                }
                const submenuRect = submenu?.getBoundingClientRect();

                if (submenuRect) {
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
              }
            }, 200);
          }}
          onClick={(e) => {
            // Prevent click from propagating to close the main dropdown
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            // Prevent mousedown from propagating to close the main dropdown
            e.stopPropagation();
          }}
        >
          {additionalExecutables.map((executableName) => (
            <button
              key={executableName}
              type="button"
              className="additional-executables-dropdown-item"
              onClick={(e) => handleExecutableClick(e, executableName)}
              onMouseDown={(e) => {
                // Prevent mousedown from propagating
                e.stopPropagation();
              }}
            >
              {executableName}
            </button>
          ))}
        </div>
  ) : null;

  return (
    <div className="additional-executables-dropdown" ref={dropdownRef}>
      {shouldUsePortal && typeof document !== 'undefined' 
        ? createPortal(menuContent, document.body)
        : menuContent
      }
    </div>
  );
}
