import type { TFunction } from "i18next";
import TagEditor from "../../common/TagEditor";

type EditGameTagsTabProps = {
  t: TFunction;
  isOpen: boolean;
  gameId: number | string;
  selectedGenres: string[];
  selectedThemes: string[];
  selectedKeywords: string[];
  selectedPlatforms: string[];
  selectedGameModes: string[];
  selectedPublishers: string[];
  selectedDevelopers: string[];
  selectedPlayerPerspectives: string[];
  selectedGameEngines: string[];
  saving: boolean;
  setSelectedGenres: (genres: string[]) => void;
  setSelectedThemes: (themes: string[]) => void;
  setSelectedKeywords: (keywords: string[]) => void;
  setSelectedPlatforms: (platforms: string[]) => void;
  setSelectedGameModes: (modes: string[]) => void;
  setSelectedPublishers: (publishers: string[]) => void;
  setSelectedDevelopers: (developers: string[]) => void;
  setSelectedPlayerPerspectives: (perspectives: string[]) => void;
  setSelectedGameEngines: (engines: string[]) => void;
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
  selectedPublishers,
  selectedDevelopers,
  selectedPlayerPerspectives,
  selectedGameEngines,
  saving,
  setSelectedGenres,
  setSelectedThemes,
  setSelectedKeywords,
  setSelectedPlatforms,
  setSelectedGameModes,
  setSelectedPublishers,
  setSelectedDevelopers,
  setSelectedPlayerPerspectives,
  setSelectedGameEngines,
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
          />
        )}
      </div>
      <div className="edit-game-modal-field">
        <div className="edit-game-modal-label">{t("gameDetail.publishers", "Publishers")}</div>
        {isOpen && (
          <TagEditor
            key={`tag-editor-publishers-${gameId}-${isOpen}`}
            mode="freeform"
            selectedTags={selectedPublishers}
            onTagsChange={setSelectedPublishers}
            disabled={saving}
            placeholder={t("gameDetail.addPublisher", "Add publisher...")}
          />
        )}
      </div>
      <div className="edit-game-modal-field">
        <div className="edit-game-modal-label">{t("gameDetail.developers", "Developers")}</div>
        {isOpen && (
          <TagEditor
            key={`tag-editor-developers-${gameId}-${isOpen}`}
            mode="freeform"
            selectedTags={selectedDevelopers}
            onTagsChange={setSelectedDevelopers}
            disabled={saving}
            placeholder={t("gameDetail.addDeveloper", "Add developer...")}
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
    </>
  );
}
