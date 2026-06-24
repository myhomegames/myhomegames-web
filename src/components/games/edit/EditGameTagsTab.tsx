import { useState, useEffect, useId } from "react";
import type { TFunction } from "i18next";
import TagEditor from "../../common/TagEditor";
import type { IdNameItem } from "./FranchiseSeriesEditor";
import { useTagLists } from "../../../contexts/TagListsContext";
import { API_BASE, getApiToken } from "../../../config";
import { buildApiUrl, buildApiHeaders } from "../../../utils/api";

/** Deterministic numeric id from name (same as server-side hash for franchise/series). */
function hashStringToId(s: string): number {
  if (!s || !s.trim()) return 0;
  let h = 0;
  const str = s.trim();
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h = h | 0;
  }
  return h >>> 0;
}

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
  const tagInputGenre = useId();
  const tagInputThemes = useId();
  const tagInputKeywords = useId();
  const tagInputPlatforms = useId();
  const tagInputGameModes = useId();
  const tagInputPlayerPerspectives = useId();
  const tagInputGameEngines = useId();
  const tagInputFranchise = useId();
  const tagInputSeries = useId();
  const { tagLabels } = useTagLists();
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [availableGameModes, setAvailableGameModes] = useState<string[]>([]);
  const [availablePlayerPerspectives, setAvailablePlayerPerspectives] = useState<string[]>([]);
  const [availableGameEngines, setAvailableGameEngines] = useState<string[]>([]);
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);
  const [availableFranchises, setAvailableFranchises] = useState<IdNameItem[]>([]);
  const [availableSeries, setAvailableSeries] = useState<IdNameItem[]>([]);

  // Suggestions from cache (TagListsContext)
  useEffect(() => {
    if (!isOpen) return;
    setAvailableThemes(Array.from(tagLabels.themes.values()));
    setAvailablePlatforms(Array.from(tagLabels.platforms.values()));
    setAvailableGameModes(Array.from(tagLabels.gameModes.values()));
    setAvailablePlayerPerspectives(Array.from(tagLabels.playerPerspectives.values()));
    setAvailableGameEngines(Array.from(tagLabels.gameEngines.values()));
    setAvailableFranchises(
      Array.from(tagLabels.franchises.entries()).map(([id, name]) => ({ id: Number(id), name }))
    );
    setAvailableSeries(
      Array.from(tagLabels.series.entries()).map(([id, name]) => ({ id: Number(id), name }))
    );
  }, [isOpen, tagLabels]);

  // Keywords: not in TagListsContext, fetch when modal opens
  useEffect(() => {
    if (!isOpen || !getApiToken()) return;
    fetch(buildApiUrl(API_BASE, "/keywords"), { headers: buildApiHeaders({ Accept: "application/json" }) })
      .then((r) => (r.ok ? r.json() : { keywords: [] }))
      .then((data) => setAvailableKeywords(Array.isArray(data.keywords) ? data.keywords : []))
      .catch(() => {});
  }, [isOpen]);

  return (
    <>
      <div className="edit-game-modal-field">
        <label className="edit-game-modal-label" htmlFor={tagInputGenre}>
          {t("gameDetail.genre", "Genre")}
        </label>
        {isOpen && (
          <TagEditor
            key={`tag-editor-genres-${gameId}-${isOpen}`}
            inputId={tagInputGenre}
            selectedTags={selectedGenres}
            onTagsChange={setSelectedGenres}
            disabled={saving}
            placeholder={t("gameDetail.addGenre", "Add genre...")}
          />
        )}
      </div>
      <div className="edit-game-modal-field">
        <label className="edit-game-modal-label" htmlFor={tagInputThemes}>
          {t("gameDetail.themes", "Themes")}
        </label>
        {isOpen && (
          <TagEditor
            key={`tag-editor-themes-${gameId}-${isOpen}`}
            inputId={tagInputThemes}
            mode="freeform"
            selectedTags={selectedThemes}
            onTagsChange={setSelectedThemes}
            disabled={saving}
            placeholder={t("gameDetail.addTheme", "Add theme...")}
            getDisplayName={(value) => t(`themes.${value}`, value)}
            availableTags={availableThemes}
          />
        )}
      </div>
      <div className="edit-game-modal-field">
        <label className="edit-game-modal-label" htmlFor={tagInputKeywords}>
          {t("gameDetail.keywords", "Keywords")}
        </label>
        {isOpen && (
          <TagEditor
            key={`tag-editor-keywords-${gameId}-${isOpen}`}
            inputId={tagInputKeywords}
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
        <label className="edit-game-modal-label" htmlFor={tagInputPlatforms}>
          {t("gameDetail.platforms", "Platforms")}
        </label>
        {isOpen && (
          <TagEditor
            key={`tag-editor-platforms-${gameId}-${isOpen}`}
            inputId={tagInputPlatforms}
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
        <label className="edit-game-modal-label" htmlFor={tagInputGameModes}>
          {t("gameDetail.gameModes", "Game Modes")}
        </label>
        {isOpen && (
          <TagEditor
            key={`tag-editor-game-modes-${gameId}-${isOpen}`}
            inputId={tagInputGameModes}
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
        <label className="edit-game-modal-label" htmlFor={tagInputPlayerPerspectives}>
          {t("gameDetail.playerPerspectives", "Player Perspectives")}
        </label>
        {isOpen && (
          <TagEditor
            key={`tag-editor-player-perspectives-${gameId}-${isOpen}`}
            inputId={tagInputPlayerPerspectives}
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
        <label className="edit-game-modal-label" htmlFor={tagInputGameEngines}>
          {t("gameDetail.gameEngines", "Game Engines")}
        </label>
        {isOpen && (
          <TagEditor
            key={`tag-editor-game-engines-${gameId}-${isOpen}`}
            inputId={tagInputGameEngines}
            mode="freeform"
            selectedTags={selectedGameEngines}
            onTagsChange={setSelectedGameEngines}
            disabled={saving}
            placeholder={t("gameDetail.addGameEngine", "Add game engine...")}
            availableTags={availableGameEngines}
          />
        )}
      </div>
      <div className="edit-game-modal-field">
        <label className="edit-game-modal-label" htmlFor={tagInputFranchise}>
          {t("catalogInfo.franchise", "Franchise")}
        </label>
        {isOpen && (
          <TagEditor
            key={`tag-editor-franchise-${gameId}-${isOpen}`}
            inputId={tagInputFranchise}
            mode="freeform"
            selectedTags={selectedFranchise.map((f) => f.name)}
            onTagsChange={(names) =>
              setSelectedFranchise(
                names
                  .filter((name) => name.trim())
                  .map((name) => {
                    const opt = availableFranchises.find((o) => o.name === name);
                    if (opt) return opt;
                    const current = selectedFranchise.find((o) => o.name === name);
                    if (current) return current;
                    return { id: hashStringToId(name), name: name.trim() };
                  }) as IdNameItem[]
              )
            }
            disabled={saving}
            placeholder={t("gameDetail.addFranchise", "Add franchise...")}
            availableTags={availableFranchises.map((f) => f.name)}
            allowCreate={true}
          />
        )}
      </div>
      <div className="edit-game-modal-field">
        <label className="edit-game-modal-label" htmlFor={tagInputSeries}>
          {t("catalogInfo.series", "Series")}
        </label>
        {isOpen && (
          <TagEditor
            key={`tag-editor-series-${gameId}-${isOpen}`}
            inputId={tagInputSeries}
            mode="freeform"
            selectedTags={selectedSeries.map((s) => s.name)}
            onTagsChange={(names) =>
              setSelectedSeries(
                names
                  .filter((name) => name.trim())
                  .map((name) => {
                    const opt = availableSeries.find((o) => o.name === name);
                    if (opt) return opt;
                    const current = selectedSeries.find((o) => o.name === name);
                    if (current) return current;
                    return { id: hashStringToId(name), name: name.trim() };
                  }) as IdNameItem[]
              )
            }
            disabled={saving}
            placeholder={t("gameDetail.addSeries", "Add series...")}
            availableTags={availableSeries.map((s) => s.name)}
            allowCreate={true}
          />
        )}
      </div>
    </>
  );
}
