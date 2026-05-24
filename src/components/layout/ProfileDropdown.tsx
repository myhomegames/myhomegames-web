import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Tooltip from "../common/Tooltip";
import ProfilePanelContent from "../profile/ProfilePanelContent";
import { useAuth } from "../../contexts/AuthContext";
import { useSkin } from "../../contexts/SkinContext";

type ProfileDropdownPanel = "menu" | "profile";

type ProfileDropdownProps = {
  onViewProfile?: () => void;
  onChangeUser?: () => void;
  onLogout?: () => void;
  /** PS3 libraries strip: same look as other `mhg-library-button` entries, opens sheet on click. */
  triggerVariant?: "header" | "library";
  libraryActive?: boolean;
};

export default function ProfileDropdown({
  onViewProfile,
  onChangeUser,
  onLogout,
  triggerVariant = "header",
  libraryActive = false,
}: ProfileDropdownProps) {
  const { t } = useTranslation();
  const { user, login, logout } = useAuth();
  const { activeSkinWeb } = useSkin();
  const navigate = useNavigate();

  const keepProfileInDropdown = activeSkinWeb.libraryBarHeaderActions;
  const userName = user?.userName || "User";
  const userImage = user?.userImage || undefined;
  const [isOpen, setIsOpen] = useState(false);
  const [panel, setPanel] = useState<ProfileDropdownPanel>("menu");
  const menuRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) setPanel("menu");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

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

    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleChangeUser = () => {
    setIsOpen(false);
    if (onChangeUser) {
      onChangeUser();
    } else {
      logout();
      setTimeout(() => {
        login(true);
      }, 100);
    }
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    if (onLogout) {
      onLogout();
    }
  };

  const libraryTrigger = triggerVariant === "library";
  const triggerIsActive = libraryActive || (libraryTrigger && isOpen);

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
      aria-label={t("header.profile")}
      aria-expanded={isOpen}
    >
      {!libraryTrigger && (
        <>
          <svg
            width="20"
            height="20"
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
          <svg
            className={`profile-dropdown-arrow ${isOpen ? "profile-dropdown-arrow-open" : ""}`}
            width="12"
            height="12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
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

      {isOpen && (
        <div
          ref={popupRef}
          className="profile-dropdown-popup"
          data-mhg-profile-dropdown-panel={panel}
        >
          {panel === "menu" ? (
            <>
              <button
                type="button"
                className="profile-dropdown-item profile-dropdown-header-item"
                onClick={handleViewProfile}
              >
                {userImage ? (
                  <img src={userImage} alt={userName} className="profile-dropdown-avatar" />
                ) : (
                  <div className="profile-dropdown-avatar-placeholder">
                    <svg
                      width="80"
                      height="80"
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
                )}
                <span className="profile-dropdown-username">{userName}</span>
              </button>
              <button type="button" className="profile-dropdown-item" onClick={handleViewProfile}>
                {t("profile.viewProfile", "View Profile")}
              </button>
              <div className="profile-dropdown-separator" />
              <button type="button" className="profile-dropdown-item" onClick={handleChangeUser}>
                {t("profile.changeUser", "Change User")}
              </button>
              <button
                type="button"
                className="profile-dropdown-item profile-dropdown-item-danger"
                onClick={handleLogout}
              >
                {t("profile.logout", "Logout")}
              </button>
            </>
          ) : (
            <>
              <div className="filter-popup-header profile-dropdown-panel-header">
                <button
                  type="button"
                  className="filter-popup-back"
                  onClick={() => setPanel("menu")}
                  aria-label={t("common.back", "Back")}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <span className="filter-popup-header-title">{t("profile.title", "Profile")}</span>
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
