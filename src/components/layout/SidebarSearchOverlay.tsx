import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import SearchBar from "../search/SearchBar";
import type { GameItem, CollectionItem } from "../../types";

type SidebarSearchOverlayProps = {
  open: boolean;
  onClose: () => void;
  games: GameItem[];
  collections: CollectionItem[];
  developers: CollectionItem[];
  publishers: CollectionItem[];
  onGameSelect: (game: GameItem) => void;
  onPlay?: (game: GameItem) => void;
};

export default function SidebarSearchOverlay({
  open,
  onClose,
  games,
  collections,
  developers,
  publishers,
  onGameSelect,
  onPlay,
}: SidebarSearchOverlayProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(
        "[data-mhg-sidebar-search-dialog] .mhg-search-input"
      );
      el?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!open) return null;

  const handleGameSelect = (game: GameItem) => {
    onClose();
    onGameSelect(game);
  };

  return createPortal(
    <div
      className="game-search-modal-overlay mhg-sidebar-search-overlay !z-[22100] !items-start !justify-center px-4 pb-8 pt-20"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="mhg-sidebar-search-dialog"
        data-mhg-sidebar-search-dialog
        role="dialog"
        aria-modal="true"
        aria-label={t("libraries.sidebarSearch")}
        className="game-search-modal mhg-sidebar-search-modal !h-auto !min-h-[360px] !max-h-[min(85vh,720px)] !w-full !max-w-[640px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="game-search-modal-header">
          <h2>{t("libraries.sidebarSearch")}</h2>
          <button
            type="button"
            className="game-search-modal-close"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>
        <div className="game-search-modal-list mhg-sidebar-search-modal-list !min-h-0 flex-1 !overflow-visible px-6 pb-4 pt-4">
          <SearchBar
            games={games}
            collections={collections}
            developers={developers}
            publishers={publishers}
            onGameSelect={handleGameSelect}
            onPlay={onPlay}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
