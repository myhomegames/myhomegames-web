import { useState } from "react";
import type { GameItem } from "../../../types";

type UseEditGameReturn = {
  isEditModalOpen: boolean;
  selectedGame: GameItem | null;
  openEditModal: (game: GameItem) => void;
  closeEditModal: () => void;
};

export function useEditGame(): UseEditGameReturn {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);

  const openEditModal = (game: GameItem) => {
    setSelectedGame(game);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedGame(null);
  };

  return {
    isEditModalOpen,
    selectedGame,
    openEditModal,
    closeEditModal,
  };
}

