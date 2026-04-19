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
        ".mhg-sidebar-search-overlay-panel .mhg-search-input"
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
      className="mhg-sidebar-search-overlay fixed inset-0 z-[22000] flex items-start justify-center bg-black/55 px-4 pt-20 pb-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="mhg-sidebar-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("libraries.sidebarSearch")}
        className="mhg-sidebar-search-overlay-panel w-full max-w-lg overflow-visible rounded-xl border border-white/10 bg-[#1a1a1a] p-4 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-white">{t("libraries.sidebarSearch")}</h2>
          <button
            type="button"
            className="rounded-md px-2 py-1 text-sm text-white/80 hover:bg-white/10 hover:text-white"
            onClick={onClose}
            aria-label={t("common.close")}
          >
            ×
          </button>
        </div>
        <SearchBar
          games={games}
          collections={collections}
          developers={developers}
          publishers={publishers}
          onGameSelect={handleGameSelect}
          onPlay={onPlay}
        />
      </div>
    </div>,
    document.body
  );
}
