import { useEffect, useLayoutEffect, useRef } from "react";
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

const FIT_SCALE_MIN = 0.48;
const FIT_SCALE_STEP = 0.04;
const FIT_SCALE_VAR = "--mhg-summary-fit-scale";

/** Shrink overlay type until title + full summary + info fit in the panel (no scroll). */
function fitSummaryPanel(panel: HTMLElement) {
  panel.style.setProperty(FIT_SCALE_VAR, "1");
  void panel.offsetHeight;

  let scale = 1;
  for (let i = 0; i < 24; i++) {
    if (panel.scrollHeight <= panel.clientHeight + 2) break;
    scale = Math.max(FIT_SCALE_MIN, scale - FIT_SCALE_STEP);
    panel.style.setProperty(FIT_SCALE_VAR, String(Number(scale.toFixed(3))));
    void panel.offsetHeight;
    if (scale <= FIT_SCALE_MIN) break;
  }
}

/**
 * Smart TV full-screen summary “page”: full-height cover left, full text + GameInfoBlock right.
 * Gated by skin `web.tvSummaryOverlay` at the call site. Close via Back / Escape (no chrome X).
 * Skin keeps ambient backdrop tint, hides sharp backdrop art + detail chrome via `data-mhg-summary-overlay`.
 * Type scales down so the whole page always fits the viewport (no panel scroll).
 */
export default function GameSummaryOverlay({
  open,
  onClose,
  title,
  coverUrl,
  summary,
  game,
}: GameSummaryOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);

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

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    let frame = 0;
    let fitting = false;

    const runFit = () => {
      if (fitting) return;
      fitting = true;
      fitSummaryPanel(panel);
      fitting = false;
    };

    const scheduleFit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(runFit);
    };

    runFit();

    const ro = new ResizeObserver(scheduleFit);
    ro.observe(panel);
    window.addEventListener("resize", scheduleFit);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener("resize", scheduleFit);
      panel.style.removeProperty(FIT_SCALE_VAR);
    };
  }, [open, title, summary, game]);

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
          ref={panelRef}
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
