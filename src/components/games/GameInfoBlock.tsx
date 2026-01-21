import { useTranslation } from "react-i18next";
import type { IGDBGame, GameItem } from "../../types";
import WebsitesList from "./WebsitesList";
import "./GameInfoBlock.css";

type GameInfoBlockProps = {
  game: IGDBGame | GameItem;
};

export default function GameInfoBlock({ game }: GameInfoBlockProps) {
  const { t } = useTranslation();

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

  return (
    <div className="game-info-block">

      {/* Themes */}
      {game.themes && game.themes.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.themes", "Themes")}
          </div>
          <div className="game-info-list">
            {game.themes.map((theme, index) => (
              <span key={index}>
                <span className="game-info-list-item">
                  {t(`themes.${theme}`, theme)}
                </span>
                {index < game.themes!.length - 1 && (
                  <span className="game-info-list-separator">
                    ,{" "}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Platforms */}
      {game.platforms && game.platforms.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.platforms", "Platforms")}
          </div>
          <div className="game-info-list">
            {game.platforms.map((platform, index) => (
              <span key={index}>
                <span className="game-info-list-item">
                  {platform}
                </span>
                {index < game.platforms!.length - 1 && (
                  <span className="game-info-list-separator">
                    ,{" "}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Game Modes */}
      {game.gameModes && game.gameModes.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.gameModes", "Game Modes")}
          </div>
          <div className="game-info-list">
            {game.gameModes.map((mode, index) => (
              <span key={index}>
                <span className="game-info-list-item">
                  {mode}
                </span>
                {index < game.gameModes!.length - 1 && (
                  <span className="game-info-list-separator">
                    ,{" "}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Player Perspectives */}
      {game.playerPerspectives && game.playerPerspectives.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.playerPerspectives", "Player Perspectives")}
          </div>
          <div className="game-info-list">
            {game.playerPerspectives.map((perspective, index) => (
              <span key={index}>
                <span className="game-info-list-item">
                  {perspective}
                </span>
                {index < game.playerPerspectives!.length - 1 && (
                  <span className="game-info-list-separator">
                    ,{" "}
                  </span>
                )}
              </span>
            ))}
          </div>
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
          <div className="game-info-list">
            {game.developers.map((dev, index) => (
              <span key={index}>
                <span className="game-info-list-item">
                  {dev}
                </span>
                {index < game.developers!.length - 1 && (
                  <span className="game-info-list-separator">
                    ,{" "}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Publishers */}
      {game.publishers && game.publishers.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("igdbInfo.publishers", "Publishers")}
          </div>
          <div className="game-info-list">
            {game.publishers.map((pub, index) => (
              <span key={index}>
                <span className="game-info-list-item">
                  {pub}
                </span>
                {index < game.publishers!.length - 1 && (
                  <span className="game-info-list-separator">
                    ,{" "}
                  </span>
                )}
              </span>
            ))}
          </div>
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
          <div className="game-info-list">
            {game.gameEngines.map((engine, index) => (
              <span key={index}>
                <span className="game-info-list-item">
                  {engine}
                </span>
                {index < game.gameEngines!.length - 1 && (
                  <span className="game-info-list-separator">
                    ,{" "}
                  </span>
                )}
              </span>
            ))}
          </div>
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
                <span className="game-info-list-item">
                  {sg.name}
                </span>
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

