import { useOutletContext } from "react-router-dom";
import LibraryPage from "./LibraryPage";
import RecommendedPage from "./RecommendedPage";
import CollectionsPage from "./CollectionsPage";
import DevelopersPage from "./DevelopersPage";
import PublishersPage from "./PublishersPage";
import TagListRoutePage from "./TagListRoutePage";
import type { GameItem, TagItem } from "../types";
import type { MainAppOutletContext } from "../layouts/MainAppLayout";
export type { GameItem, TagItem };

/** Main area only; libraries bar + header live in `MainAppLayout` (persistent shell). */
export default function HomePage() {
  const {
    onGameClick,
    onGamesLoaded,
    onPlay,
    activeLibrary,
    coverSize,
    viewMode,
    allCollections,
    mainGamesOnly,
    setMainGamesOnly,
  } = useOutletContext<MainAppOutletContext>();

  function handleGameClick(game: GameItem | TagItem) {
    onGameClick(game as GameItem);
  }

  function handleGamesLoaded(loadedGames: GameItem[]) {
    onGamesLoaded(loadedGames);
  }

  return (
    <div className="bg-[#1a1a1a] home-page-main-container">
      {!activeLibrary ? (
        <div className="flex items-center justify-center h-full" />
      ) : (
        <>
          {activeLibrary.key === "library" && (
            <LibraryPage
              onGameClick={handleGameClick}
              onGamesLoaded={handleGamesLoaded}
              onPlay={onPlay}
              coverSize={coverSize}
              viewMode={viewMode}
              allCollections={allCollections}
              mainGamesOnly={mainGamesOnly}
              setMainGamesOnly={setMainGamesOnly}
            />
          )}
          {activeLibrary.key === "recommended" && (
            <RecommendedPage
              onGameClick={handleGameClick}
              onGamesLoaded={handleGamesLoaded}
              onPlay={onPlay}
              coverSize={coverSize}
              allCollections={allCollections}
            />
          )}
          {activeLibrary.key === "collections" && (
            <CollectionsPage onPlay={onPlay} coverSize={coverSize} />
          )}
          {activeLibrary.key === "categories" && (
            <TagListRoutePage coverSize={coverSize} tagKey="categories" />
          )}
          {activeLibrary.key === "series" && (
            <TagListRoutePage coverSize={coverSize} tagKey="series" />
          )}
          {activeLibrary.key === "franchise" && (
            <TagListRoutePage coverSize={coverSize} tagKey="franchise" />
          )}
          {activeLibrary.key === "platforms" && (
            <TagListRoutePage coverSize={coverSize} tagKey="platforms" />
          )}
          {activeLibrary.key === "themes" && (
            <TagListRoutePage coverSize={coverSize} tagKey="themes" />
          )}
          {activeLibrary.key === "developers" && (
            <DevelopersPage onPlay={onPlay} coverSize={coverSize} />
          )}
          {activeLibrary.key === "publishers" && (
            <PublishersPage onPlay={onPlay} coverSize={coverSize} />
          )}
          {activeLibrary.key === "gameEngines" && (
            <TagListRoutePage coverSize={coverSize} tagKey="gameEngines" />
          )}
          {activeLibrary.key === "gameModes" && (
            <TagListRoutePage coverSize={coverSize} tagKey="gameModes" />
          )}
          {activeLibrary.key === "playerPerspectives" && (
            <TagListRoutePage coverSize={coverSize} tagKey="playerPerspectives" />
          )}
        </>
      )}
    </div>
  );
}
