import { useEffect } from "react";
import { createPortal } from "react-dom";
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
 * Gated by skin `web.tvSummaryOverlay` at the call site. Close via Back / Escape (no chrome X).
 * Skin keeps ambient backdrop tint, hides sharp backdrop art + detail chrome via `data-mhg-summary-overlay`.
 */
export default function GameSummaryOverlay({
  open,
  onClose,
  title,
  coverUrl,
  summary,
  game,
}: GameSummaryOverlayProps) {
  useEffect(() => {
    if (!open) return;
    requestSmartTvUiLayerFocus();
  }, [open]);

  /*
   * Skin CSS: keep ambient backdrop tint, hide sharp backdrop image + detail chrome.
   */
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.setAttribute("data-mhg-summary-overlay", "1");
    return () => {
      root.removeAttribute("data-mhg-summary-overlay");
    };
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
      {/* Visually hidden — Smart TV Back / tryDismissUiLayer activate this. */}
      <button
        type="button"
        className="game-summary-overlay-dismiss"
        data-mhg-modal-close=""
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
      />

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
