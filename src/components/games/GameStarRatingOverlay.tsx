import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { requestSmartTvUiLayerFocus } from "../../utils/smartTvRemote";
import StarRating from "../common/StarRating";

type GameStarRatingOverlayProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Display rating 0–5 (half-star steps). */
  rating: number;
  /**
   * Persist callback; receives 1–10 (half-star steps), or `null` to clear.
   * Called on Done (if changed) or Elimina.
   */
  onRatingChange?: (newRating: number | null) => void;
};

/** Ten discrete values: 1…10 on the API scale ↔ 0.5…5.0 stars. */
function toTenScale(display0to5: number): number {
  if (!Number.isFinite(display0to5) || display0to5 <= 0) return 0;
  return Math.max(1, Math.min(10, Math.round(display0to5 * 2)));
}

function fromTenScale(value1to10: number): number {
  if (!Number.isFinite(value1to10) || value1to10 <= 0) return 0;
  return Math.max(1, Math.min(10, value1to10)) / 2;
}

/**
 * Smart TV full-screen star rating “page”: eyebrow, title, stars (L/R preview), Done [/ Elimina].
 * Rating is committed only on Done; Elimina clears immediately; Back/Escape discards the draft.
 */
export default function GameStarRatingOverlay({
  open,
  onClose,
  title,
  rating,
  onRatingChange,
}: GameStarRatingOverlayProps) {
  const { t } = useTranslation();
  const [localRating, setLocalRating] = useState(rating);
  /** Snapshot of whether a rating already existed when the overlay opened. */
  const [hadRatingOnOpen, setHadRatingOnOpen] = useState(() => toTenScale(rating) >= 1);

  useEffect(() => {
    if (!open) return;
    setLocalRating(rating);
    setHadRatingOnOpen(toTenScale(rating) >= 1);
  }, [open, rating]);

  const previewTen = useCallback((ten: number) => {
    setLocalRating(fromTenScale(Math.max(1, Math.min(10, ten))));
  }, []);

  const adjustBy = useCallback(
    (delta: number) => {
      const current = toTenScale(localRating);
      if (current <= 0) {
        if (delta > 0) previewTen(1);
        return;
      }
      const next = current + delta;
      previewTen(next < 1 ? 1 : next);
    },
    [localRating, previewTen],
  );

  const confirmAndClose = useCallback(() => {
    const ten = toTenScale(localRating);
    if (ten >= 1 && onRatingChange) {
      const initialTen = toTenScale(rating);
      if (ten !== initialTen) {
        onRatingChange(ten);
      }
    }
    onClose();
  }, [localRating, onClose, onRatingChange, rating]);

  const clearAndClose = useCallback(() => {
    onRatingChange?.(null);
    onClose();
  }, [onClose, onRatingChange]);

  useEffect(() => {
    if (!open) return;
    requestSmartTvUiLayerFocus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    root.setAttribute("data-mhg-star-rating-overlay", "1");
    return () => {
      root.removeAttribute("data-mhg-star-rating-overlay");
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

  useEffect(() => {
    if (!open) return;
    const onAdjust = (e: Event) => {
      const detail = (e as CustomEvent<{ delta?: number }>).detail;
      const delta = detail?.delta;
      if (delta !== 1 && delta !== -1) return;
      adjustBy(delta);
    };
    window.addEventListener("mhg:star-rating-adjust", onAdjust);
    return () => window.removeEventListener("mhg:star-rating-adjust", onAdjust);
  }, [open, adjustBy]);

  if (!open) return null;

  const ten = toTenScale(localRating);
  const eyebrow = hadRatingOnOpen
    ? t("gameDetail.rated", "Rated")
    : t("gameDetail.rate", "Rate");

  return createPortal(
    <div
      className="game-star-rating-overlay"
      data-mhg-game-star-rating-overlay=""
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className="game-star-rating-overlay-dismiss"
        data-mhg-modal-close=""
        aria-label={t("common.close", "Close")}
        tabIndex={-1}
        onClick={onClose}
      />

      <div className="game-star-rating-overlay-panel">
        <p className="game-star-rating-overlay-eyebrow">{eyebrow}</p>
        <h2 className="game-star-rating-overlay-title">{title}</h2>
        <div
          className={`game-star-rating-overlay-stars${
            ten > 0
              ? " game-star-rating-overlay-stars--rated"
              : " game-star-rating-overlay-stars--empty"
          }`}
          tabIndex={0}
          data-mhg-tv-focus=""
          role="slider"
          aria-label={t("common.rating", "Rating")}
          aria-valuemin={1}
          aria-valuemax={10}
          aria-valuenow={ten || 0}
          aria-valuetext={`${ten || 0} / 10`}
        >
          <StarRating rating={localRating} readOnly starSize={40} gap={12} />
        </div>
        <div className="game-star-rating-overlay-actions">
          <button
            type="button"
            className="game-star-rating-overlay-done"
            data-mhg-tv-focus=""
            onClick={confirmAndClose}
          >
            {t("common.done", "Done")}
          </button>
          {hadRatingOnOpen && (
            <button
              type="button"
              className="game-star-rating-overlay-delete"
              data-mhg-tv-focus=""
              onClick={clearAndClose}
            >
              {t("common.delete", "Delete")}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
