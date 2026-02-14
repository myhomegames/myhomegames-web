import type { TFunction } from "i18next";
import TagEditor from "../../common/TagEditor";
import FranchiseSeriesEditor from "./FranchiseSeriesEditor";
import type { IdNameItem } from "./FranchiseSeriesEditor";

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
