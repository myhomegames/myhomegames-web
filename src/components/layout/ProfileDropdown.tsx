import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Tooltip from "../common/Tooltip";
import { useAuth } from "../../contexts/AuthContext";
import "./ProfileDropdown.css";

type ProfileDropdownProps = {
  onViewProfile?: () => void;
  onChangeUser?: () => void;
  onLogout?: () => void;
};

export default function ProfileDropdown({
  onViewProfile,
  onChangeUser,
  onLogout,
}: ProfileDropdownProps) {
  const { t } = useTranslation();
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  
  const userName = user?.userName || "User";
  const userImage = user?.userImage || undefined;
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

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

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleViewProfile = () => {
    setIsOpen(false);
    if (onViewProfile) {
      onViewProfile();
    } else {
      // Default: navigate to profile page
      navigate("/profile");
    }
  };

  const handleChangeUser = () => {
    setIsOpen(false);
    if (onChangeUser) {
      onChangeUser();
    } else {
      // Default: initiate login
      login();
    }
  };

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <div ref={menuRef} className="profile-dropdown-wrapper">
      <Tooltip text={t("header.profile")} position="top" delay={200}>
        <button
          className="profile-dropdown-button mhg-header-button"
          onClick={handleToggle}
          aria-label={t("header.profile")}
          aria-expanded={isOpen}
        >
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
            className={`profile-dropdown-arrow ${isOpen ? 'profile-dropdown-arrow-open' : ''}`}
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
        </button>
      </Tooltip>

      {isOpen && (
        <div ref={popupRef} className="profile-dropdown-popup">
          <button
            className="profile-dropdown-item profile-dropdown-header-item"
            onClick={handleViewProfile}
          >
            {userImage ? (
              <img 
                src={userImage} 
                alt={userName}
                className="profile-dropdown-avatar"
              />
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
          <button
            className="profile-dropdown-item"
            onClick={handleViewProfile}
          >
            {t("profile.viewProfile", "View Profile")}
          </button>
          <div className="profile-dropdown-separator"></div>
          <button
            className="profile-dropdown-item"
            onClick={handleChangeUser}
          >
            {t("profile.changeUser", "Change User")}
          </button>
          <button
            className="profile-dropdown-item profile-dropdown-item-danger"
            onClick={handleLogout}
          >
            {t("profile.logout", "Logout")}
          </button>
        </div>
      )}
    </div>
  );
}

