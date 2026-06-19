import { useEffect } from "react";
import type { CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import Logo from "../common/Logo";
import SearchBar from "../search/SearchBar";
import HeaderTitleFilter from "./HeaderTitleFilter";
import ProfileDropdown from "./ProfileDropdown";
import UpdateNotification from "./UpdateNotification";
import Tooltip from "../common/Tooltip";
import { useLoading } from "../../contexts/LoadingContext";
import ActivitySpinner from "./ActivitySpinner";
import { useSkin } from "../../contexts/SkinContext";
import { useTitleFilter } from "../../contexts/TitleFilterContext";
import { useActiveProfile } from "../../hooks/useActiveProfile";
import { usePhoneLayout } from "../../hooks/usePhoneLayout";
import { useLibrarySidebarLayout } from "../../contexts/LibrarySidebarLayoutContext";
import type { GameItem, CollectionItem } from "../../types";

const PHONE_HEADER_BUTTON: CSSProperties = { width: 32, height: 32 };
const PHONE_HEADER_ICON: CSSProperties = { width: 17, height: 17 };

/** Header-only pages: no `LibrariesBar`, so the dock logo is absent — keep the header logo when `topRightToolDock` is on. */
function pathnameUsesHeaderLogoOnly(pathname: string): boolean {
  return (
    pathname === "/settings" ||
    pathname === "/profile" ||
    pathname === "/add-game"
  );
}

type HeaderProps = {
  allGames: GameItem[];
  allCollections: CollectionItem[];
  allDevelopers?: CollectionItem[];
  allPublishers?: CollectionItem[];
  onGameSelect: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
  onHomeClick: () => void;
  onSettingsClick: () => void;
  onAddGameClick: () => void;
  hideSettingsAction?: boolean;
  hideProfileAction?: boolean;
};

export default function Header({
  allGames,
  allCollections,
  allDevelopers = [],
  allPublishers = [],
  onGameSelect,
  onPlay,
  onHomeClick,
  onSettingsClick,
  onAddGameClick,
  hideSettingsAction = false,
  hideProfileAction = false,
}: HeaderProps) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { isLoading } = useLoading();
  const { activeSkinWeb } = useSkin();
  const { setQuery: setTitleFilterQuery } = useTitleFilter();
  const { showProfile } = useActiveProfile();
  const isPhoneLayout = usePhoneLayout();
  const { collapsibleActive, sidebarOpen, toggleSidebar } = useLibrarySidebarLayout();

  const phoneHeaderContainerStyle: CSSProperties | undefined = isPhoneLayout
    ? { gap: 8, padding: "0 8px", minWidth: 0 }
    : undefined;
  const phoneSearchContainerStyle: CSSProperties | undefined = isPhoneLayout
    ? { flex: "1 1 0", minWidth: 0, maxWidth: "none" }
    : undefined;
  const phoneHeaderActionsStyle: CSSProperties | undefined = isPhoneLayout
    ? { gap: 2, flexShrink: 0 }
    : undefined;

  const isGameDetailRoute =
    pathname.startsWith("/game/") || pathname.startsWith("/igdb-game/");
  const hideHeaderTitleFilter = pathname === "/settings" || isGameDetailRoute;
  const hideSettings = hideSettingsAction || activeSkinWeb.libraryBarHeaderActions;
  const hideProfile = hideProfileAction || activeSkinWeb.libraryBarHeaderActions;
  /* Add Game follows the same relocation rule as settings/profile. */
  const hideAddGame = activeSkinWeb.libraryBarHeaderActions;
  /*
   * GOG persistent shell: keep the “+” in the header flex row (margin-left anchor) but hide it
   * on game detail — removing it from the DOM shifts the settings icon.
   */
  const layoutOnlyAddGame =
    activeSkinWeb.persistentLibraryShell && isGameDetailRoute && !hideAddGame;
  const addGameTooltipWrapperStyle: CSSProperties | undefined = layoutOnlyAddGame
    ? { visibility: "hidden", pointerEvents: "none" }
    : undefined;
  const hideHeaderSearch = activeSkinWeb.libraryBarHeaderActions && activeSkinWeb.sidebarSearchPopup;
  const hideHeaderLogo =
    activeSkinWeb.topRightToolDock && !pathnameUsesHeaderLogoOnly(pathname);

  useEffect(() => {
    if (!activeSkinWeb.headerTitleFilter || hideHeaderTitleFilter) {
      setTitleFilterQuery("");
    }
  }, [activeSkinWeb.headerTitleFilter, hideHeaderTitleFilter, setTitleFilterQuery]);

  return (
    <header className="mhg-header">
      <div
        className="mhg-header-container"
        style={phoneHeaderContainerStyle}
        {...(isPhoneLayout ? { "data-mhg-phone-header": "true" } : {})}
      >
        {collapsibleActive && (
          <button
            type="button"
            className="mhg-library-sidebar-toggle mhg-header-button"
            onClick={toggleSidebar}
            aria-expanded={sidebarOpen}
            aria-label={t("libraries.toggleSidebar")}
            style={{
              pointerEvents: "auto",
              position: "relative",
              zIndex: 10020,
              ...(isPhoneLayout ? PHONE_HEADER_BUTTON : {}),
            }}
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
              style={isPhoneLayout ? PHONE_HEADER_ICON : undefined}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        {/* Logo on the left; with `topRightToolDock` it is duplicated in LibrariesBar on shell routes only. */}
        {!hideHeaderLogo && (
          <button
            onClick={onHomeClick}
            className="mhg-logo-button"
            aria-label={t("header.home")}
            style={isPhoneLayout ? { height: 40 } : undefined}
          >
            <Logo width={isPhoneLayout ? 64 : 90} height={isPhoneLayout ? 40 : 50} />
          </button>
        )}

        {/* Search or per-page title filter (skin `web.headerTitleFilter`); on settings/game detail leave empty, no search */}
        <div className="mhg-search-container" style={phoneSearchContainerStyle}>
          {hideHeaderSearch
            ? null
            : activeSkinWeb.headerTitleFilter
              ? hideHeaderTitleFilter
                ? null
                : <HeaderTitleFilter />
              : (
                <SearchBar
                  games={allGames}
                  collections={allCollections}
                  developers={allDevelopers}
                  publishers={allPublishers}
                  onGameSelect={onGameSelect}
                  onPlay={onPlay}
                  shrinkToFit={isPhoneLayout}
                />
              )}
        </div>

        {/* Buttons on the right */}
        <div className="mhg-header-actions" style={phoneHeaderActionsStyle}>
          {!activeSkinWeb.topRightToolDock && (
            <ActivitySpinner
              isLoading={isLoading}
              style={isPhoneLayout ? PHONE_HEADER_BUTTON : undefined}
              iconStyle={isPhoneLayout ? PHONE_HEADER_ICON : undefined}
            />
          )}
          {!hideAddGame && (
            <Tooltip
              text={t("header.addGame")}
              position="top"
              delay={200}
              wrapperStyle={addGameTooltipWrapperStyle}
            >
              <button
                className="mhg-header-button"
                data-mhg-header-action="add-game"
                aria-label={t("header.addGame")}
                aria-hidden={layoutOnlyAddGame ? true : undefined}
                tabIndex={layoutOnlyAddGame ? -1 : undefined}
                onClick={onAddGameClick}
                style={isPhoneLayout ? PHONE_HEADER_BUTTON : undefined}
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  style={isPhoneLayout ? PHONE_HEADER_ICON : undefined}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </button>
            </Tooltip>
          )}
          {!hideSettings && (
            <Tooltip text={t("header.settings")} position="top" delay={200}>
              <button
                className="mhg-header-button"
                aria-label={t("header.settings")}
                onClick={onSettingsClick}
                style={isPhoneLayout ? PHONE_HEADER_BUTTON : undefined}
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  style={isPhoneLayout ? PHONE_HEADER_ICON : undefined}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </Tooltip>
          )}
          {!activeSkinWeb.topRightToolDock && (
            <UpdateNotification
              buttonStyle={isPhoneLayout ? PHONE_HEADER_BUTTON : undefined}
              iconStyle={isPhoneLayout ? PHONE_HEADER_ICON : undefined}
            />
          )}
          {showProfile && !hideProfile && (
            <ProfileDropdown compactHeader={isPhoneLayout} />
          )}
        </div>
      </div>
    </header>
  );
}
