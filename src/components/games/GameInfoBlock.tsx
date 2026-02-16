import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { IGDBGame, GameItem } from "../../types";
import { useLibraryGames } from "../../contexts/LibraryGamesContext";
import { useDevelopers } from "../../contexts/DevelopersContext";
import { usePublishers } from "../../contexts/PublishersContext";
import { useTagLists } from "../../contexts/TagListsContext";
import WebsitesList from "./WebsitesList";
import InlineTagList from "../common/InlineTagList";
import "./GameInfoBlock.css";

type GameInfoBlockProps = {
  game: IGDBGame | GameItem;
};

/** Normalize API field (number[] or legacy object[]) to string[] of ids. */
function toIdStrings(value: unknown): string[] {
  if (value == null || !Array.isArray(value)) return [];
  return value.map((x) =>
    typeof x === "object" && x != null && "id" in x ? String((x as { id: number }).id) : String(x)
  );
}

export default function GameInfoBlock({ game }: GameInfoBlockProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { games: libraryGames } = useLibraryGames();
  const { developers } = useDevelopers();
  const { publishers } = usePublishers();
  const { tagLabels } = useTagLists();

  const gameId = "id" in game ? String(game.id) : undefined;

  const franchiseIds = toIdStrings(game.franchise);
  const seriesIds = toIdStrings(game.series ?? game.collection);

  const hasInfo =
    gameId !== undefined ||
    (game.themes && game.themes.length > 0) ||
    (game.platforms && game.platforms.length > 0) ||
    (game.gameModes && game.gameModes.length > 0) ||
    (game.playerPerspectives && game.playerPerspectives.length > 0) ||
    (game.websites && game.websites.length > 0) ||
    (game.developers && game.developers.length > 0) ||
    (game.publishers && game.publishers.length > 0) ||
    franchiseIds.length > 0 ||
    seriesIds.length > 0 ||
    (game.screenshots && game.screenshots.length > 0) ||
    (game.gameEngines && game.gameEngines.length > 0) ||
    (game.alternativeNames && game.alternativeNames.length > 0) ||
    (game.similarGames && game.similarGames.length > 0);

  if (!hasInfo) {
    return null;
  }

  const renderTagListByIds = (
    ids: string[],
    routeBase: string,
    getLabel: (id: string) => string
  ) => (
    <InlineTagList
      items={ids}
      getLabel={getLabel}
      onItemClick={(id) => navigate(`${routeBase}/${encodeURIComponent(id)}`)}
      useInfoStyles
      showMoreMinCount={5}
      showMoreLabel={t("gameDetail.andMore", ", and more")}
    />
  );

  const similarGamesInLibrary = useMemo(() => {
    const map = new Map<string, GameItem>();
    for (const item of libraryGames) {
      map.set(String(item.id), item);
    }
    return map;
  }, [libraryGames]);

  // Names from game payload (e.g. IGDB response has { id, name }) so we show names even when not in library
  const developerNamesFromGame = useMemo(() => {
    const m = new Map<string, string>();
    if (game.developers && Array.isArray(game.developers)) {
      for (const d of game.developers) {
        const id = typeof d === "object" && d != null && "id" in d ? String((d as { id: number }).id) : String(d);
        const name = typeof d === "object" && d != null && "name" in d ? (d as { name: string }).name : null;
        if (id && name) m.set(id, name);
      }
    }
    return m;
  }, [game.developers]);
  const publisherNamesFromGame = useMemo(() => {
    const m = new Map<string, string>();
    if (game.publishers && Array.isArray(game.publishers)) {
      for (const p of game.publishers) {
        const id = typeof p === "object" && p != null && "id" in p ? String((p as { id: number }).id) : String(p);
        const name = typeof p === "object" && p != null && "name" in p ? (p as { name: string }).name : null;
        if (id && name) m.set(id, name);
      }
    }
    return m;
  }, [game.publishers]);

  return (
    <div className="game-info-block">

      {/* Themes */}
      {game.themes && game.themes.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.themes", "Themes")}
          </div>
          {renderTagListByIds(
            toIdStrings(game.themes),
            "/themes",
            (id) =>
              t(`themes.${tagLabels.themes.get(id) ?? id}`, tagLabels.themes.get(id) ?? id)
          )}
        </div>
      )}

      {/* Platforms */}
      {game.platforms && game.platforms.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.platforms", "Platforms")}
          </div>
          {renderTagListByIds(
            toIdStrings(game.platforms),
            "/platforms",
            (id) => tagLabels.platforms.get(id) ?? id
          )}
        </div>
      )}

      {/* Game Modes */}
      {game.gameModes && game.gameModes.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.gameModes", "Game Modes")}
          </div>
          {renderTagListByIds(
            toIdStrings(game.gameModes),
            "/game-modes",
            (id) => t(`gameModes.${tagLabels.gameModes.get(id) ?? id}`, tagLabels.gameModes.get(id) ?? id)
          )}
        </div>
      )}

      {/* Player Perspectives */}
      {game.playerPerspectives && game.playerPerspectives.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.playerPerspectives", "Player Perspectives")}
          </div>
          {renderTagListByIds(
            toIdStrings(game.playerPerspectives),
            "/player-perspectives",
            (id) =>
              t(
                `playerPerspectives.${tagLabels.playerPerspectives.get(id) ?? id}`,
                tagLabels.playerPerspectives.get(id) ?? id
              )
          )}
        </div>
      )}

      {/* Websites */}
      {game.websites && game.websites.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.websites", "Websites")}
          </div>
          <WebsitesList websites={game.websites} />
        </div>
      )}

      {/* Developers (show name from game payload e.g. IGDB { id, name }, else from library context) */}
      {game.developers && game.developers.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.developers", "Developers")}
          </div>
          <InlineTagList
            items={toIdStrings(game.developers)}
            getLabel={(id) => developerNamesFromGame.get(id) ?? developers.find((d) => String(d.id) === id)?.title ?? id}
            onItemClick={(value) =>
              navigate(`/developers/${encodeURIComponent(value)}`)
            }
            useInfoStyles
            showMoreMinCount={5}
            showMoreLabel={t("gameDetail.andMore", ", and more")}
          />
        </div>
      )}

      {/* Publishers (show name from game payload e.g. IGDB { id, name }, else from library context) */}
      {game.publishers && game.publishers.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.publishers", "Publishers")}
          </div>
          <InlineTagList
            items={toIdStrings(game.publishers)}
            getLabel={(id) => publisherNamesFromGame.get(id) ?? publishers.find((p) => String(p.id) === id)?.title ?? id}
            onItemClick={(value) =>
              navigate(`/publishers/${encodeURIComponent(value)}`)
            }
            useInfoStyles
            showMoreMinCount={5}
            showMoreLabel={t("gameDetail.andMore", ", and more")}
          />
        </div>
      )}

      {/* Franchise */}
      {franchiseIds.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.franchise", "Franchise")}
          </div>
          {renderTagListByIds(
            franchiseIds,
            "/franchise",
            (id) => tagLabels.franchises.get(id) ?? id
          )}
        </div>
      )}

      {/* Series (collection) */}
      {seriesIds.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.series", "Series")}
          </div>
          {renderTagListByIds(
            seriesIds,
            "/series",
            (id) => tagLabels.series.get(id) ?? id
          )}
        </div>
      )}

      {/* Game Engines */}
      {game.gameEngines && game.gameEngines.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.gameEngines", "Game Engines")}
          </div>
          {renderTagListByIds(
            toIdStrings(game.gameEngines),
            "/game-engines",
            (id) => tagLabels.gameEngines.get(id) ?? id
          )}
        </div>
      )}

      {/* Alternative Names */}
      {game.alternativeNames && game.alternativeNames.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.alternativeNames", "Alternative Names")}
          </div>
          <InlineTagList
            items={game.alternativeNames}
            getLabel={(name) => name}
            useInfoStyles
            showMoreMinCount={5}
            showMoreLabel={t("gameDetail.andMore", ", and more")}
          />
        </div>
      )}

      {/* Similar Games */}
      {game.similarGames && game.similarGames.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.similarGames", "Similar Games")}
          </div>
          <InlineTagList
            items={game.similarGames}
            getLabel={(sg) => sg.name}
            getKey={(sg) => String(sg.id)}
            onItemClick={(sg) => navigate(`/game/${sg.id}`)}
            isClickable={(sg) => similarGamesInLibrary.has(String(sg.id))}
            useInfoStyles
            showMoreMinCount={5}
            showMoreLabel={t("gameDetail.andMore", ", and more")}
          />
        </div>
      )}
    </div>
  );
}

