import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { IGDBGame, GameItem } from "../../types";
import { useLibraryGames } from "../../contexts/LibraryGamesContext";
import WebsitesList from "./WebsitesList";
import InlineTagList from "../common/InlineTagList";
import "./GameInfoBlock.css";

type GameInfoBlockProps = {
  game: IGDBGame | GameItem;
};

export default function GameInfoBlock({ game }: GameInfoBlockProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { games: libraryGames } = useLibraryGames();

  // Get game ID (for GameItem it's id, for IGDBGame it's id as number)
  const gameId = 'id' in game ? String(game.id) : undefined;

  type FranchiseSeriesItem = string | { id: number; name: string };
  const toFranchiseSeriesList = (
    value: FranchiseSeriesItem | FranchiseSeriesItem[] | undefined
  ): FranchiseSeriesItem[] => {
    if (value == null) return [];
    return Array.isArray(value) ? value : [value];
  };
  const franchiseList = toFranchiseSeriesList(game.franchise);
  const seriesList = toFranchiseSeriesList(game.series ?? game.collection);

  // Check if game has any IGDB fields
  const hasInfo =
    gameId !== undefined ||
    (game.themes && game.themes.length > 0) ||
    (game.platforms && game.platforms.length > 0) ||
    (game.gameModes && game.gameModes.length > 0) ||
    (game.playerPerspectives && game.playerPerspectives.length > 0) ||
    (game.websites && game.websites.length > 0) ||
    (game.developers && game.developers.length > 0) ||
    (game.publishers && game.publishers.length > 0) ||
    franchiseList.length > 0 ||
    seriesList.length > 0 ||
    (game.screenshots && game.screenshots.length > 0) ||
    (game.gameEngines && game.gameEngines.length > 0) ||
    (game.alternativeNames && game.alternativeNames.length > 0) ||
    (game.similarGames && game.similarGames.length > 0);

  if (!hasInfo) {
    return null;
  }

  const formatFranchiseOrSeries = (value: FranchiseSeriesItem | undefined): string => {
    if (value == null) return "";
    if (typeof value === "string") return value;
    return value.name;
  };

  const toFranchiseSeriesIds = (list: FranchiseSeriesItem[]): string[] =>
    list.map((item) => (typeof item === "string" ? item : String(item.id)));

  type TagItem = { id: number; title: string } | string;
  const renderTagList = (
    items: TagItem[],
    routeBase: string,
    display: (value: TagItem) => string
  ) => (
    <InlineTagList
      items={items}
      getLabel={display}
      onItemClick={(value) =>
        navigate(
          typeof value === "object" && value != null && "id" in value
            ? `${routeBase}/${value.id}`
            : `${routeBase}/${encodeURIComponent(String(value))}`
        )
      }
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

  return (
    <div className="game-info-block">

      {/* Themes */}
      {game.themes && game.themes.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.themes", "Themes")}
          </div>
          {renderTagList(
            game.themes as TagItem[],
            "/themes",
            (value) =>
              typeof value === "object" && value != null && "title" in value
                ? t(`themes.${value.title}`, value.title)
                : t(`themes.${value}`, String(value))
          )}
        </div>
      )}

      {/* Platforms */}
      {game.platforms && game.platforms.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.platforms", "Platforms")}
          </div>
          {renderTagList(
            game.platforms as TagItem[],
            "/platforms",
            (value) =>
              typeof value === "object" && value != null && "title" in value
                ? value.title
                : String(value)
          )}
        </div>
      )}

      {/* Game Modes */}
      {game.gameModes && game.gameModes.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.gameModes", "Game Modes")}
          </div>
          {renderTagList(
            game.gameModes as TagItem[],
            "/game-modes",
            (value) =>
              typeof value === "object" && value != null && "title" in value
                ? t(`gameModes.${value.title}`, value.title)
                : t(`gameModes.${value}`, String(value))
          )}
        </div>
      )}

      {/* Player Perspectives */}
      {game.playerPerspectives && game.playerPerspectives.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.playerPerspectives", "Player Perspectives")}
          </div>
          {renderTagList(
            game.playerPerspectives as TagItem[],
            "/player-perspectives",
            (value) =>
              typeof value === "object" && value != null && "title" in value
                ? t(`playerPerspectives.${value.title}`, value.title)
                : t(`playerPerspectives.${value}`, String(value))
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

      {/* Developers */}
      {game.developers && game.developers.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.developers", "Developers")}
          </div>
          <InlineTagList
            items={game.developers.map((d) => String(d.id))}
            getLabel={(id) =>
              game.developers?.find((d) => String(d.id) === id)?.name ?? id
            }
            onItemClick={(value) =>
              navigate(`/developers/${encodeURIComponent(value)}`)
            }
            useInfoStyles
            showMoreMinCount={5}
            showMoreLabel={t("gameDetail.andMore", ", and more")}
          />
        </div>
      )}

      {/* Publishers */}
      {game.publishers && game.publishers.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.publishers", "Publishers")}
          </div>
          <InlineTagList
            items={game.publishers.map((p) => String(p.id))}
            getLabel={(id) =>
              game.publishers?.find((p) => String(p.id) === id)?.name ?? id
            }
            onItemClick={(value) =>
              navigate(`/publishers/${encodeURIComponent(value)}`)
            }
            useInfoStyles
            showMoreMinCount={5}
            showMoreLabel={t("gameDetail.andMore", ", and more")}
          />
        </div>
      )}

      {/* Franchise (list) */}
      {franchiseList.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.franchise", "Franchise")}
          </div>
          <InlineTagList
            items={toFranchiseSeriesIds(franchiseList)}
            getLabel={(id) =>
              formatFranchiseOrSeries(
                franchiseList.find((item) =>
                  typeof item === "string" ? item === id : String(item.id) === id
                )
              )
            }
            onItemClick={(id) => navigate(`/franchise/${encodeURIComponent(id)}`)}
            useInfoStyles
            showMoreMinCount={5}
            showMoreLabel={t("gameDetail.andMore", ", and more")}
          />
        </div>
      )}

      {/* Series (IGDB "collection" – list) */}
      {seriesList.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.series", "Series")}
          </div>
          <InlineTagList
            items={toFranchiseSeriesIds(seriesList)}
            getLabel={(id) =>
              formatFranchiseOrSeries(
                seriesList.find((item) =>
                  typeof item === "string" ? item === id : String(item.id) === id
                )
              )
            }
            onItemClick={(id) => navigate(`/series/${encodeURIComponent(id)}`)}
            useInfoStyles
            showMoreMinCount={5}
            showMoreLabel={t("gameDetail.andMore", ", and more")}
          />
        </div>
      )}


      {/* Game Engines */}
      {game.gameEngines && game.gameEngines.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.gameEngines", "Game Engines")}
          </div>
          {renderTagList(
            game.gameEngines as TagItem[],
            "/game-engines",
            (value) =>
              typeof value === "object" && value != null && "title" in value ? value.title : String(value)
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

