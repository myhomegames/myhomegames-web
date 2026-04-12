import { useTranslation } from "react-i18next";
import Tooltip from "../common/Tooltip";
type NewGamesToggleProps = {
  showNewGames: boolean;
  onChange: (show: boolean) => void;
  disabled?: boolean;
};

export default function NewGamesToggle({
  showNewGames,
  onChange,
  disabled = false,
}: NewGamesToggleProps) {
  const { t } = useTranslation();

  return (
    <Tooltip text={t("tagGames.newGamesTooltip")} delay={1000}>
      <button
        type="button"
        className="new-games-toggle-button"
        onClick={() => !disabled && onChange(!showNewGames)}
        disabled={disabled}
        aria-label={showNewGames ? t("tagGames.hideNewGames") : t("tagGames.showNewGames")}
      >
        <span className="new-games-toggle-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6.3-4.6L5.7 21l2.3-7-6-4.6h7.6L12 2z"
              fill="currentColor"
              opacity={showNewGames ? 1 : 0.5}
            />
          </svg>
        </span>
      </button>
    </Tooltip>
  );
}
