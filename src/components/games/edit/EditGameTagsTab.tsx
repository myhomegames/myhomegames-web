import { useState, useEffect } from "react";
import type { TFunction } from "i18next";
import TagEditor from "../../common/TagEditor";
import FranchiseSeriesEditor from "./FranchiseSeriesEditor";
import type { IdNameItem } from "./FranchiseSeriesEditor";
import { API_BASE, getApiToken } from "../../../config";
import { buildApiUrl, buildApiHeaders } from "../../../utils/api";

type EditGameTagsTabProps = {
  t: TFunction;
  isOpen: boolean;
  gameId: number | string;
  selectedGenres: string[];
  selectedThemes: string[];
  selectedKeywords: string[];
  selectedPlatforms: string[];
  selectedGameModes: string[];
  selectedPlayerPerspectives: string[];
  selectedGameEngines: string[];
  selectedFranchise: IdNameItem[];
  selectedSeries: IdNameItem[];
  saving: boolean;
  setSelectedGenres: (genres: string[]) => void;
  setSelectedThemes: (themes: string[]) => void;
  setSelectedKeywords: (keywords: string[]) => void;
  setSelectedPlatforms: (platforms: string[]) => void;
  setSelectedGameModes: (modes: string[]) => void;
  setSelectedPlayerPerspectives: (perspectives: string[]) => void;
  setSelectedGameEngines: (engines: string[]) => void;
  setSelectedFranchise: (value: IdNameItem[]) => void;
  setSelectedSeries: (value: IdNameItem[]) => void;
};

export default function EditGameTagsTab({
  t,
  isOpen,
  gameId,
  selectedGenres,
  selectedThemes,
  selectedKeywords,
  selectedPlatforms,
  selectedGameModes,
  selectedPlayerPerspectives,
  selectedGameEngines,
  selectedFranchise,
  selectedSeries,
  saving,
  setSelectedGenres,
  setSelectedThemes,
  setSelectedKeywords,
  setSelectedPlatforms,
  setSelectedGameModes,
  setSelectedPlayerPerspectives,
  setSelectedGameEngines,
  setSelectedFranchise,
  setSelectedSeries,
}: EditGameTagsTabProps) {
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [availableGameModes, setAvailableGameModes] = useState<string[]>([]);
  const [availablePlayerPerspectives, setAvailablePlayerPerspectives] = useState<string[]>([]);
  const [availableGameEngines, setAvailableGameEngines] = useState<string[]>([]);
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen || !getApiToken()) return;
    const toTitles = (list: Array<{ title?: string; name?: string }> | undefined) =>
      (list || []).map((x) => String((x as { title?: string }).title ?? (x as { name?: string }).name ?? "")).filter(Boolean);
    Promise.all([
      fetch(buildApiUrl(API_BASE, "/themes"), { headers: buildApiHeaders({ Accept: "application/json" }) }).then((r) => (r.ok ? r.json() : { themes: [] })),
      fetch(buildApiUrl(API_BASE, "/platforms"), { headers: buildApiHeaders({ Accept: "application/json" }) }).then((r) => (r.ok ? r.json() : { platforms: [] })),
      fetch(buildApiUrl(API_BASE, "/game-modes"), { headers: buildApiHeaders({ Accept: "application/json" }) }).then((r) => (r.ok ? r.json() : { gameModes: [] })),
      fetch(buildApiUrl(API_BASE, "/player-perspectives"), { headers: buildApiHeaders({ Accept: "application/json" }) }).then((r) => (r.ok ? r.json() : { playerPerspectives: [] })),
      fetch(buildApiUrl(API_BASE, "/game-engines"), { headers: buildApiHeaders({ Accept: "application/json" }) }).then((r) => (r.ok ? r.json() : { gameEngines: [] })),
      fetch(buildApiUrl(API_BASE, "/keywords"), { headers: buildApiHeaders({ Accept: "application/json" }) }).then((r) => (r.ok ? r.json() : { keywords: [] })),
    ])
      .then(([t, p, gm, pp, ge, kw]) => {
        setAvailableThemes(toTitles(t.themes));
        setAvailablePlatforms(toTitles(p.platforms));
        setAvailableGameModes(toTitles(gm.gameModes));
        setAvailablePlayerPerspectives(toTitles(pp.playerPerspectives));
        setAvailableGameEngines(toTitles(ge.gameEngines));
        setAvailableKeywords(Array.isArray(kw.keywords) ? kw.keywords : []);
      })
      .catch(() => {});
  }, [isOpen]);

  return (
    <>
      <div className="edit-game-modal-field">
        <div className="edit-game-modal-label">{t("gameDetail.genre", "Genre")}</div>
        {isOpen && (
          <TagEditor
            key={`tag-editor-genres-${gameId}-${isOpen}`}
            selectedTags={selectedGenres}
            onTagsChange={setSelectedGenres}
            disabled={saving}
            placeholder={t("gameDetail.addGenre", "Add genre...")}
          />
        )}
      </div>
      <div className="edit-game-modal-field">
        <div className="edit-game-modal-label">{t("gameDetail.themes", "Themes")}</div>
        {isOpen && (
          <TagEditor
            key={`tag-editor-themes-${gameId}-${isOpen}`}
            mode="freeform"
            selectedTags={selectedThemes}
            onTagsChange={setSelectedThemes}
            disabled={saving}
            placeholder={t("gameDetail.addTheme", "Add theme...")}
            availableTags={availableThemes}
          />
        )}
      </div>
      <div className="edit-game-modal-field">
        <div className="edit-game-modal-label">{t("gameDetail.keywords", "Keywords")}</div>
        {isOpen && (
          <TagEditor
            key={`tag-editor-keywords-${gameId}-${isOpen}`}
            mode="freeform"
            selectedTags={selectedKeywords}
            onTagsChange={setSelectedKeywords}
            disabled={saving}
            placeholder={t("gameDetail.addKeyword", "Add keyword...")}
            availableTags={availableKeywords}
          />
        )}
      </div>
      <div className="edit-game-modal-field">
        <div className="edit-game-modal-label">{t("gameDetail.platforms", "Platforms")}</div>
        {isOpen && (
          <TagEditor
            key={`tag-editor-platforms-${gameId}-${isOpen}`}
            mode="freeform"
            selectedTags={selectedPlatforms}
            onTagsChange={setSelectedPlatforms}
            disabled={saving}
            placeholder={t("gameDetail.addPlatform", "Add platform...")}
            availableTags={availablePlatforms}
          />
        )}
      </div>
      <div className="edit-game-modal-field">
        <div className="edit-game-modal-label">{t("gameDetail.gameModes", "Game Modes")}</div>
        {isOpen && (
          <TagEditor
            key={`tag-editor-game-modes-${gameId}-${isOpen}`}
            mode="freeform"
            selectedTags={selectedGameModes}
            onTagsChange={setSelectedGameModes}
            disabled={saving}
            placeholder={t("gameDetail.addGameMode", "Add game mode...")}
            getDisplayName={(value) => t(`gameModes.${value}`, value)}
            availableTags={availableGameModes}
          />
        )}
      </div>
      <div className="edit-game-modal-field">
        <div className="edit-game-modal-label">
          {t("gameDetail.playerPerspectives", "Player Perspectives")}
        </div>
        {isOpen && (
          <TagEditor
            key={`tag-editor-player-perspectives-${gameId}-${isOpen}`}
            mode="freeform"
            selectedTags={selectedPlayerPerspectives}
            onTagsChange={setSelectedPlayerPerspectives}
            disabled={saving}
            placeholder={t("gameDetail.addPlayerPerspective", "Add player perspective...")}
            getDisplayName={(value) => t(`playerPerspectives.${value}`, value)}
            availableTags={availablePlayerPerspectives}
          />
        )}
      </div>
      <div className="edit-game-modal-field">
        <div className="edit-game-modal-label">{t("gameDetail.gameEngines", "Game Engines")}</div>
        {isOpen && (
          <TagEditor
            key={`tag-editor-game-engines-${gameId}-${isOpen}`}
            mode="freeform"
            selectedTags={selectedGameEngines}
            onTagsChange={setSelectedGameEngines}
            disabled={saving}
            placeholder={t("gameDetail.addGameEngine", "Add game engine...")}
            availableTags={availableGameEngines}
          />
        )}
      </div>
      {isOpen && (
        <FranchiseSeriesEditor
          label={t("igdbInfo.franchise", "Franchise")}
          value={selectedFranchise}
          onChange={setSelectedFranchise}
          disabled={saving}
          apiEndpoint="franchises"
          listResponseKey="franchises"
        />
      )}
      {isOpen && (
        <FranchiseSeriesEditor
          label={t("igdbInfo.series", "Series")}
          value={selectedSeries}
          onChange={setSelectedSeries}
          disabled={saving}
          apiEndpoint="series"
          listResponseKey="series"
        />
      )}
    </>
  );
}
