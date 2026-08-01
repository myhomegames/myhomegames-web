import { useTranslation } from "react-i18next";

type DetailBackButtonProps = {
  onClick: () => void;
};

/** Phone game/catalog detail: navigate back (left side of the libraries row). */
export default function DetailBackButton({ onClick }: DetailBackButtonProps) {
  const { t } = useTranslation();
  const label = t("common.back", "Back");

  return (
    <button
      type="button"
      className="detail-back-button"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <span className="detail-back-button-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <path
            d="M15 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
