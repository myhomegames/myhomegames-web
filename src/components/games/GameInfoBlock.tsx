import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { IGDBGame, GameItem } from "../../types";
import { useLibraryGames } from "../../contexts/LibraryGamesContext";
import WebsitesList from "./WebsitesList";
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
    game.franchise ||
    game.collection ||
    (game.screenshots && game.screenshots.length > 0) ||
    (game.gameEngines && game.gameEngines.length > 0) ||
    (game.alternativeNames && game.alternativeNames.length > 0) ||
    (game.similarGames && game.similarGames.length > 0);

  if (!hasInfo) {
    return null;
  }

  const renderTagList = (
    items: string[],
    routeBase: string,
    display: (value: string) => string
  ) => (
    <div className="game-info-list">
      {items.map((value, index) => (
        <span key={`${routeBase}-${value}-${index}`}>
          <button
            type="button"
            className="game-info-list-item game-info-list-link"
            onClick={() => navigate(`${routeBase}/${encodeURIComponent(value)}`)}
          >
            {display(value)}
          </button>
          {index < items.length - 1 && (
            <span className="game-info-list-separator">,{" "}</span>
          )}
        </span>
      ))}
    </div>
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
          {renderTagList(game.themes, "/themes", (value) =>
            t(`themes.${value}`, value)
          )}
        </div>
      )}

      {/* Platforms */}
      {game.platforms && game.platforms.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.platforms", "Platforms")}
          </div>
          {renderTagList(game.platforms, "/platforms", (value) => value)}
        </div>
      )}

      {/* Game Modes */}
      {game.gameModes && game.gameModes.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.gameModes", "Game Modes")}
          </div>
          {renderTagList(game.gameModes, "/game-modes", (value) =>
            t(`gameModes.${value}`, value)
          )}
        </div>
      )}

      {/* Player Perspectives */}
      {game.playerPerspectives && game.playerPerspectives.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.playerPerspectives", "Player Perspectives")}
          </div>
          {renderTagList(game.playerPerspectives, "/player-perspectives", (value) =>
            t(`playerPerspectives.${value}`, value)
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
          {renderTagList(game.developers, "/developers", (value) => value)}
        </div>
      )}

      {/* Publishers */}
      {game.publishers && game.publishers.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.publishers", "Publishers")}
          </div>
          {renderTagList(game.publishers, "/publishers", (value) => value)}
        </div>
      )}

      {/* Franchise */}
      {game.franchise && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.franchise", "Franchise")}
          </div>
          <div className="game-info-value">
            {game.franchise}
          </div>
        </div>
      )}

      {/* Collection */}
      {game.collection && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.collection", "Collection")}
          </div>
          <div className="game-info-value">
            {game.collection}
          </div>
        </div>
      )}


      {/* Game Engines */}
      {game.gameEngines && game.gameEngines.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.gameEngines", "Game Engines")}
          </div>
          {renderTagList(game.gameEngines, "/game-engines", (value) => value)}
        </div>
      )}

      {/* Alternative Names */}
      {game.alternativeNames && game.alternativeNames.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.alternativeNames", "Alternative Names")}
          </div>
          <div className="game-info-list">
            {game.alternativeNames.map((name, index) => (
              <span key={index}>
                <span className="game-info-list-item">
                  {name}
                </span>
                {index < game.alternativeNames!.length - 1 && (
                  <span className="game-info-list-separator">
                    ,{" "}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Similar Games */}
      {game.similarGames && game.similarGames.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.similarGames", "Similar Games")}
          </div>
          <div className="game-info-list">
            {game.similarGames.slice(0, 5).map((sg, index) => (
              <span key={index}>
                {similarGamesInLibrary.has(String(sg.id)) ? (
                  <button
                    type="button"
                    className="game-info-list-item game-info-list-link"
                    onClick={() => navigate(`/game/${sg.id}`)}
                  >
                    {sg.name}
                  </button>
                ) : (
                  <span className="game-info-list-item">
                    {sg.name}
                  </span>
                )}
                {index < Math.min(game.similarGames!.length, 5) - 1 && (
                  <span className="game-info-list-separator">
                    ,{" "}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

