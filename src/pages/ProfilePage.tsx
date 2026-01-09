import { useTranslation } from "react-i18next";
import { useAuth } from "../contexts/AuthContext";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="profile-page">
        <div className="profile-container">
          <div className="profile-header">
            <h1 className="profile-title">{t("profile.title", "Profile")}</h1>
            <p className="profile-subtitle">{t("profile.notLoggedIn", "Non sei autenticato")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-header">
          <h1 className="profile-title">{t("profile.title", "Profile")}</h1>
          <p className="profile-subtitle">{t("profile.subtitle", "Your account information")}</p>
        </div>

        <div className="bg-[#1a1a1a] profile-card">
          <div className="profile-card-header">
            <h2 className="profile-card-title">{t("profile.userInfo", "User Information")}</h2>
          </div>

          <div className="profile-card-content">
            <div className="profile-avatar-section">
              {user.userImage ? (
                <img 
                  src={user.userImage} 
                  alt={user.userName}
                  className="profile-avatar-large"
                />
              ) : (
                <div className="profile-avatar-large-placeholder">
                  <svg
                    width="120"
                    height="120"
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
            </div>

            <div className="profile-info-section">
              <div className="profile-field">
                <div className="profile-label">{t("profile.username", "Username")}</div>
                <div className="profile-value">{user.userName}</div>
              </div>

              <div className="profile-field">
                <div className="profile-label">{t("profile.userId", "User ID")}</div>
                <div className="profile-value">{user.userId}</div>
              </div>

              {user.isDev && (
                <div className="profile-field">
                  <div className="profile-label">{t("profile.accountType", "Account Type")}</div>
                  <div className="profile-value profile-value-dev">
                    {t("profile.developmentAccount", "Development Account")}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

