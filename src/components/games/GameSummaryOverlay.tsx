import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { CatalogGame, GameItem } from "../../types";
import { requestSmartTvUiLayerFocus } from "../../utils/smartTvRemote";
import Cover from "./Cover";
import GameInfoBlock from "./GameInfoBlock";

type GameSummaryOverlayProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  coverUrl: string | null | undefined;
  summary: string;
  game: CatalogGame | GameItem;
};

/**
 * Smart TV full-screen summary “page”: full-height cover left, full text + GameInfoBlock right.
 * Gated by skin `web.tvSummaryOverlay` at the call site.
 */
export default function GameSummaryOverlay({
  open,
  onClose,
  title,
  coverUrl,
  summary,
  game,
}: GameSummaryOverlayProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    requestSmartTvUiLayerFocus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="game-summary-overlay"
      data-mhg-game-summary-overlay=""
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="game-summary-overlay-close"
        data-mhg-modal-close=""
        data-mhg-tv-focus=""
        aria-label={t("common.close", "Close")}
        onClick={onClose}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <div className="game-summary-overlay-layout">
        <div className="game-summary-overlay-cover">
          <Cover
            title={title}
            coverUrl={coverUrl || undefined}
            width={420}
            height={630}
            imageFit="cover"
            showTitle={false}
            titlePosition="overlay"
            detail={false}
            play={false}
            showBorder={false}
          />
        </div>

        <div
          className="game-summary-overlay-panel"
          tabIndex={0}
          data-mhg-tv-focus=""
        >
          <h2 className="game-summary-overlay-title">{title}</h2>
          <div className="game-summary-overlay-text">{summary}</div>
          <div className="game-summary-overlay-info">
            <GameInfoBlock game={game} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
