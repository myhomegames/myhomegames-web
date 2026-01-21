import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { API_BASE, getApiToken } from "../../../config";
import { buildApiUrl } from "../../../utils/api";
import { useLoading } from "../../../contexts/LoadingContext";
import type { GameItem } from "../../../types";

type UseExecutableProps = {
  game: GameItem;
  onGameUpdate: (updatedGame: GameItem) => void;
};

type UseExecutableReturn = {
  isUploading: boolean;
  isUnlinking: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileSelect: (file: File) => Promise<void>;
  handleBrowseClick: () => void;
  handleUnlinkExecutable: () => Promise<void>;
};

export function useExecutable({
  game,
  onGameUpdate,
}: UseExecutableProps): UseExecutableReturn {
  const { t } = useTranslation();
  const { setLoading } = useLoading();
  const [isUploading, setIsUploading] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    // Validate file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.sh') && !fileName.endsWith('.bat')) {
      alert(t("gameDetail.invalidFileType", "Only .sh and .bat files are allowed"));
      return;
    }

    setIsUploading(true);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const url = buildApiUrl(API_BASE, `/games/${game.id}/upload-executable`);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'X-Auth-Token': getApiToken() || '',
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to upload file' }));
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const result = await response.json();

      // Update game with the extension from server response
      // The server has already saved it in the JSON, we just update the local state
      if (result.game) {
        const updatedGame: GameItem = {
          ...game, // Preserve all existing fields
          id: result.game.id,
          title: result.game.title,
          summary: result.game.summary || "",
          cover: result.game.cover,
          background: result.game.background,
          day: result.game.day ?? game.day ?? null,
          month: result.game.month ?? game.month ?? null,
          year: result.game.year ?? game.year ?? null,
          stars: result.game.stars ?? game.stars ?? null,
          genre: result.game.genre ?? game.genre ?? null,
          criticratings: result.game.criticratings ?? game.criticratings ?? null,
          userratings: result.game.userratings ?? game.userratings ?? null,
          executables: result.game.executables ?? game.executables ?? null, // Array of executable names
          // Preserve all other fields from original game
          themes: result.game.themes ?? game.themes ?? null,
          platforms: result.game.platforms ?? game.platforms ?? null,
          gameModes: result.game.gameModes ?? game.gameModes ?? null,
          playerPerspectives: result.game.playerPerspectives ?? game.playerPerspectives ?? null,
          websites: result.game.websites ?? game.websites ?? null,
          ageRatings: result.game.ageRatings ?? game.ageRatings ?? null,
          developers: result.game.developers ?? game.developers ?? null,
          publishers: result.game.publishers ?? game.publishers ?? null,
          franchise: result.game.franchise ?? game.franchise ?? null,
          collection: result.game.collection ?? game.collection ?? null,
          screenshots: result.game.screenshots ?? game.screenshots ?? null,
          videos: result.game.videos ?? game.videos ?? null,
          gameEngines: result.game.gameEngines ?? game.gameEngines ?? null,
          keywords: result.game.keywords ?? game.keywords ?? null,
          alternativeNames: result.game.alternativeNames ?? game.alternativeNames ?? null,
          similarGames: result.game.similarGames ?? game.similarGames ?? null,
        };
        onGameUpdate(updatedGame);
      }
    } catch (err: any) {
      console.error('Error uploading file:', err);
      alert(err.message || t("common.error", "Error"));
    } finally {
      setIsUploading(false);
      setLoading(false);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleUnlinkExecutable = async () => {
    setIsUnlinking(true);
    setLoading(true);

    try {
      const url = buildApiUrl(API_BASE, `/games/${game.id}`);
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Auth-Token": getApiToken(),
        },
        body: JSON.stringify({ executables: null }),
      });

      if (response.ok) {
        const result = await response.json();
        const updatedGame: GameItem = {
          ...game, // Preserve all existing fields
          id: result.game.id,
          title: result.game.title,
          summary: result.game.summary || "",
          cover: result.game.cover,
          background: result.game.background,
          day: result.game.day ?? game.day ?? null,
          month: result.game.month ?? game.month ?? null,
          year: result.game.year ?? game.year ?? null,
          stars: result.game.stars ?? game.stars ?? null,
          genre: result.game.genre ?? game.genre ?? null,
          criticratings: result.game.criticratings ?? game.criticratings ?? null,
          userratings: result.game.userratings ?? game.userratings ?? null,
          // Preserve all other fields from original game
          themes: result.game.themes ?? game.themes ?? null,
          platforms: result.game.platforms ?? game.platforms ?? null,
          gameModes: result.game.gameModes ?? game.gameModes ?? null,
          playerPerspectives: result.game.playerPerspectives ?? game.playerPerspectives ?? null,
          websites: result.game.websites ?? game.websites ?? null,
          ageRatings: result.game.ageRatings ?? game.ageRatings ?? null,
          developers: result.game.developers ?? game.developers ?? null,
          publishers: result.game.publishers ?? game.publishers ?? null,
          franchise: result.game.franchise ?? game.franchise ?? null,
          collection: result.game.collection ?? game.collection ?? null,
          screenshots: result.game.screenshots ?? game.screenshots ?? null,
          videos: result.game.videos ?? game.videos ?? null,
          gameEngines: result.game.gameEngines ?? game.gameEngines ?? null,
          keywords: result.game.keywords ?? game.keywords ?? null,
          alternativeNames: result.game.alternativeNames ?? game.alternativeNames ?? null,
          similarGames: result.game.similarGames ?? game.similarGames ?? null,
        };
        // Explicitly remove executables if it exists
        if ('executables' in updatedGame) {
          delete (updatedGame as any).executables;
        }
        onGameUpdate(updatedGame);
      } else {
        console.error("Failed to unlink executable");
      }
    } catch (error) {
      console.error("Error unlinking executable:", error);
    } finally {
      setIsUnlinking(false);
      setLoading(false);
    }
  };

  return {
    isUploading,
    isUnlinking,
    fileInputRef,
    handleFileSelect,
    handleBrowseClick,
    handleUnlinkExecutable,
  };
}

