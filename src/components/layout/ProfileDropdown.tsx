import { useState, useRef, useEffect, type MouseEvent as ReactMouseEvent } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import Tooltip from "../common/Tooltip";
import ProfilePanelContent from "../profile/ProfilePanelContent";
import { useSkin } from "../../contexts/SkinContext";
import { bindSheetBackdropClose } from "../../utils/sheetPopupBackdrop";
import { useTunnel } from "../../contexts/TunnelContext";
import { useActiveProfile } from "../../hooks/useActiveProfile";
import { isSmartTvBrowser } from "../../utils/smartTv";
import { requestSmartTvUiLayerFocus } from "../../utils/smartTvRemote";

type ProfileDropdownPanel = "menu" | "profile";

type ProfileDropdownProps = {
  onViewProfile?: () => void;
  /** Libraries strip: same look as other `mhg-library-button` entries, opens sheet on click. */
  triggerVariant?: "header" | "library";
  libraryActive?: boolean;
  /** Compact header icon row on phone-width viewports. */
  compactHeader?: boolean;
  /** PS3 strip: snap-focus + step sound on mouse hover (icons without a list). */
  onTriggerMouseEnter?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
};

function ProfileAvatarPlaceholder({ size = 80 }: { size?: number }) {
  return (
    <div className="profile-dropdown-avatar-placeholder">
      <svg
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      </svg>
    </div>
  );
}

export default function ProfileDropdown({
  onViewProfile,
  triggerVariant = "header",
  libraryActive = false,
  compactHeader = false,
  onTriggerMouseEnter,
}: ProfileDropdownProps) {
  const { t } = useTranslation();
  const { activeSkinWeb } = useSkin();
  const { disconnect } = useTunnel();
  const { displayName, displayImage, hasCloudflareProfile } = useActiveProfile();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const keepProfileInDropdown = activeSkinWeb.libraryBarHeaderActions;
  /** Smart TV: open the dedicated /profile page (like Settings), never the sheet. */
  const openAsDedicatedPage = isSmartTvBrowser();
  const isProfileRoute = pathname === "/profile";
  const [isOpen, setIsOpen] = useState(false);
  const [panel, setPanel] = useState<ProfileDropdownPanel>("menu");
  const menuRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) setPanel("menu");
  }, [isOpen]);

  /** TV remote: park focus on the first sheet row after open / panel change. */
  useEffect(() => {
    if (!isOpen || openAsDedicatedPage) return;
    requestSmartTvUiLayerFocus();
  }, [isOpen, panel, openAsDedicatedPage]);

  useEffect(() => {
    if (!isOpen || openAsDedicatedPage) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      if (menuRef.current && menuRef.current.contains(target)) {
        return;
      }

      if (popupRef.current && popupRef.current.contains(target)) {
        return;
      }

      setIsOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, openAsDedicatedPage]);

  // Close / step back on Escape / TV Back (tryDismissUiLayer → mhg:close-dropdown-menus + Escape).
  useEffect(() => {
    if (!isOpen || openAsDedicatedPage) return;

    // tryDismiss fires both events for one Back — apply only one step.
    let handled = false;
    function stepBackOrClose() {
      if (handled) return;
      handled = true;
      queueMicrotask(() => {
        handled = false;
      });
      if (panel === "profile") {
        setPanel("menu");
        return;
      }
      setIsOpen(false);
    }

    function handleCloseAllMenus() {
      stepBackOrClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" && event.keyCode !== 27) return;
      event.preventDefault();
      event.stopPropagation();
      stepBackOrClose();
    }

    window.addEventListener("mhg:close-dropdown-menus", handleCloseAllMenus);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("mhg:close-dropdown-menus", handleCloseAllMenus);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isOpen, panel, openAsDedicatedPage]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (openAsDedicatedPage) {
      if (!isProfileRoute) navigate("/profile");
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleViewProfile = () => {
    if (onViewProfile) {
      setIsOpen(false);
      onViewProfile();
      return;
    }

    if (keepProfileInDropdown) {
      setPanel("profile");
      return;
    }

    setIsOpen(false);
    navigate("/profile");
  };

  const handleBackToMenu = () => {
    setPanel("menu");
  };

  const handleDisconnectTunnel = async () => {
    if (!window.confirm(t("settings.cloudflare.confirmDisconnect"))) {
      return;
    }
    setIsOpen(false);
    await disconnect();
  };

  const libraryTrigger = triggerVariant === "library";
  const triggerIsActive =
    libraryActive || isProfileRoute || (libraryTrigger && isOpen && !openAsDedicatedPage);

  const triggerButton = (
    <button
      type="button"
      className={
        libraryTrigger
          ? `profile-dropdown-button profile-dropdown-button--library mhg-library-button flex min-w-0 items-center gap-2 text-left${
              triggerIsActive ? " mhg-library-active" : ""
            }`
          : "profile-dropdown-button mhg-header-button"
      }
      data-mhg-library-key={libraryTrigger ? "mhg-header-profile" : undefined}
      onClick={handleToggle}
      onMouseEnter={libraryTrigger ? onTriggerMouseEnter : undefined}
      aria-label={t("header.profile")}
      aria-expanded={openAsDedicatedPage ? isProfileRoute : isOpen}
      aria-current={isProfileRoute ? "page" : undefined}
      style={
        compactHeader && !libraryTrigger
          ? { width: 32, height: 32, gap: 0, padding: 0 }
          : undefined
      }
    >
      {!libraryTrigger && (
        <>
          <svg
            width={compactHeader ? 17 : 20}
            height={compactHeader ? 17 : 20}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
          {!openAsDedicatedPage && (
            <svg
              className={`profile-dropdown-arrow ${isOpen ? "profile-dropdown-arrow-open" : ""}`}
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              style={compactHeader ? { display: "none" } : undefined}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 8.25l-7.5 7.5-7.5-7.5"
              />
            </svg>
          )}
        </>
      )}
      {libraryTrigger && (
        <span className="mhg-library-button-label min-w-0 flex-1 truncate">
          {t("header.profile")}
        </span>
      )}
    </button>
  );

  return (
    <div ref={menuRef} className="profile-dropdown-wrapper">
      {libraryTrigger ? (
        triggerButton
      ) : (
        <Tooltip text={t("header.profile")} position="top" delay={200}>
          {triggerButton}
        </Tooltip>
      )}

      {isOpen && !openAsDedicatedPage && (
        <div
          ref={popupRef}
          className="profile-dropdown-popup"
          data-mhg-profile-dropdown-panel={panel}
          {...bindSheetBackdropClose(activeSkinWeb.disableTitleTooltips, () => setIsOpen(false))}
        >
          {panel === "menu" ? (
            <>
              <button
                type="button"
                className="profile-dropdown-item profile-dropdown-header-item"
                onClick={handleViewProfile}
              >
                {displayImage ? (
                  <img src={displayImage} alt={displayName} className="profile-dropdown-avatar" />
                ) : (
                  <ProfileAvatarPlaceholder />
                )}
                <span className="profile-dropdown-username">{displayName}</span>
              </button>
              <button type="button" className="profile-dropdown-item" onClick={handleViewProfile}>
                {t("profile.viewProfile", "View Profile")}
              </button>
              {hasCloudflareProfile && (
                <>
                  <div className="profile-dropdown-separator" />
                  <button
                    type="button"
                    className="profile-dropdown-item profile-dropdown-item-danger"
                    onClick={handleDisconnectTunnel}
                  >
                    {t("settings.cloudflare.disconnect", "Disconnect tunnel")}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="profile-dropdown-panel-header">
                <button
                  type="button"
                  className="profile-dropdown-item"
                  onClick={handleBackToMenu}
                >
                  {t("common.back", "Back")}
                </button>
              </div>
              <div className="profile-dropdown-panel-scroll">
                <ProfilePanelContent variant="dropdown" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
