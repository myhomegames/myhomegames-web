import { useState, useEffect } from "react";
import type { TFunction } from "i18next";
import TagEditor from "../../common/TagEditor";
import type { IdNameItem } from "./FranchiseSeriesEditor";
import { API_BASE, getApiToken } from "../../../config";
import { buildApiUrl, buildApiHeaders } from "../../../utils/api";

function toIdName(list: Array<{ id: number; title?: string; name?: string }> | undefined): IdNameItem[] {
  return (list || []).map((x) => ({
    id: Number(x.id),
    name: String(x.title ?? x.name ?? x.id),
  }));
}

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
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>([]);
  const [availableGameModes, setAvailableGameModes] = useState<string[]>([]);
  const [availablePlayerPerspectives, setAvailablePlayerPerspectives] = useState<string[]>([]);
  const [availableGameEngines, setAvailableGameEngines] = useState<string[]>([]);
  const [availableKeywords, setAvailableKeywords] = useState<string[]>([]);
  const [availableFranchises, setAvailableFranchises] = useState<IdNameItem[]>([]);
  const [availableSeries, setAvailableSeries] = useState<IdNameItem[]>([]);

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
      fetch(buildApiUrl(API_BASE, "/franchises"), { headers: buildApiHeaders({ Accept: "application/json" }) }).then((r) => (r.ok ? r.json() : { franchises: [] })),
      fetch(buildApiUrl(API_BASE, "/series"), { headers: buildApiHeaders({ Accept: "application/json" }) }).then((r) => (r.ok ? r.json() : { series: [] })),
    ])
      .then(([t, p, gm, pp, ge, kw, fr, sr]) => {
        setAvailableThemes(toTitles(t.themes));
        setAvailablePlatforms(toTitles(p.platforms));
        setAvailableGameModes(toTitles(gm.gameModes));
        setAvailablePlayerPerspectives(toTitles(pp.playerPerspectives));
        setAvailableGameEngines(toTitles(ge.gameEngines));
        setAvailableKeywords(Array.isArray(kw.keywords) ? kw.keywords : []);
        setAvailableFranchises(toIdName(fr.franchises));
        setAvailableSeries(toIdName(sr.series));
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
      <div className="edit-game-modal-field">
        <div className="edit-game-modal-label">{t("igdbInfo.franchise", "Franchise")}</div>
        {isOpen && (
          <TagEditor
            key={`tag-editor-franchise-${gameId}-${isOpen}`}
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
        <div className="edit-game-modal-label">{t("igdbInfo.series", "Series")}</div>
        {isOpen && (
          <TagEditor
            key={`tag-editor-series-${gameId}-${isOpen}`}
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
