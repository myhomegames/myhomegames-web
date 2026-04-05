import { useTranslation } from "react-i18next";
import Tooltip from "../common/Tooltip";
import "./MainGamesToggle.css";

type MainGamesToggleProps = {
  mainGamesOnly: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

/** Toggle to show only IGDB main games (type 0); same placement/style as NewGamesToggle. */
export default function MainGamesToggle({
  mainGamesOnly,
  onChange,
  disabled = false,
}: MainGamesToggleProps) {
  const { t } = useTranslation();

  return (
    <Tooltip text={t("tagGames.mainGamesTooltip")} delay={1000}>
      <button
        type="button"
        className="main-games-toggle-button"
        onClick={() => !disabled && onChange(!mainGamesOnly)}
        disabled={disabled}
        aria-label={mainGamesOnly ? t("tagGames.showAllGameTypes") : t("tagGames.mainGamesOnly")}
      >
        <span className="main-games-toggle-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M4 8h16v10H4V8zm2 2v6h12v-6H6zm2-6h8v4H8V4z"
              fill="currentColor"
              opacity={mainGamesOnly ? 1 : 0.45}
            />
          </svg>
        </span>
      </button>
    </Tooltip>
  );
}
