import TagGamesPage from "./TagGamesPage";
import type { GameItem, CollectionItem } from "../types";
import { TAG_PAGE_CONFIGS, type TagKey } from "../utils/tagPages";

type TagGamesRoutePageProps = {
  onGameClick: (game: GameItem) => void;
  onGamesLoaded: (games: GameItem[]) => void;
  onPlay?: (game: GameItem) => void;
  allCollections?: CollectionItem[];
  tagKey: TagKey;
};

export default function TagGamesRoutePage({
  onGameClick,
  onGamesLoaded,
  onPlay,
  allCollections,
  tagKey,
}: TagGamesRoutePageProps) {
  const config = TAG_PAGE_CONFIGS[tagKey];

  return (
    <TagGamesPage
      onGameClick={onGameClick}
      onGamesLoaded={onGamesLoaded}
      onPlay={onPlay}
      allCollections={allCollections}
      tagField={config.detail.tagField}
      paramName={config.detail.paramName}
      storageKey={config.detail.storageKey}
    />
  );
}
