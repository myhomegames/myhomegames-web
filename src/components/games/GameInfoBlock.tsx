import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { CatalogGame, GameItem } from "../../types";
import { getTagId } from "../../utils/tagId";
import { useDevelopers } from "../../contexts/DevelopersContext";
import { usePublishers } from "../../contexts/PublishersContext";
import { useTagLists } from "../../contexts/TagListsContext";
import WebsitesList from "./WebsitesList";
import InlineTagList from "../common/InlineTagList";
type GameInfoBlockProps = {
  game: CatalogGame | GameItem;
};

/** Normalize API field (number[] or legacy object[]) to string[] of ids. */
function toIdStrings(value: unknown): string[] {
  if (value == null || !Array.isArray(value)) return [];
  return value.map((x) =>
    typeof x === "object" && x != null && "id" in x ? String((x as { id: number }).id) : String(x)
  );
}

/** When game has tag objects with name (IGDB), use library-style hash id for links and optional ?name= for tag page. */
function getTagLinkInfo(arr: unknown[]): {
  linkIds: string[];
  hashToDisplayName: Map<string, string>;
  getSearchParams: (id: string) => string;
} {
  const hasNames =
    arr &&
    Array.isArray(arr) &&
    arr.length > 0 &&
    arr.every((x) => typeof x === "object" && x != null && "name" in x && typeof (x as { name: string }).name === "string");
  if (!hasNames || !arr.length) {
    return { linkIds: toIdStrings(arr), hashToDisplayName: new Map(), getSearchParams: () => "" };
  }
  const linkIds: string[] = [];
  const hashToDisplayName = new Map<string, string>();
  const hashToNameForQuery = new Map<string, string>();
  for (const x of arr) {
    const name = (x as { name: string }).name;
    const hash = String(getTagId(name));
    linkIds.push(hash);
    hashToDisplayName.set(hash, name);
    hashToNameForQuery.set(hash, name);
  }
  return {
    linkIds,
    hashToDisplayName,
    getSearchParams: (id: string) => {
      const name = hashToNameForQuery.get(id);
      return name ? `?name=${encodeURIComponent(name)}` : "";
    },
  };
}

export default function GameInfoBlock({ game }: GameInfoBlockProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
    (game.alternativeNames && game.alternativeNames.length > 0);

  if (!hasInfo) {
    return null;
  }

  const renderTagListByIds = (
    ids: string[],
    routeBase: string,
    getLabel: (id: string) => string,
    getSearchParams?: (id: string) => string,
    isClickable?: (id: string) => boolean,
    getItemClassName?: (id: string) => string | undefined
  ) => (
    <InlineTagList
      items={ids}
      getLabel={getLabel}
      onItemClick={(id) =>
        navigate(`${routeBase}/${encodeURIComponent(id)}${getSearchParams ? getSearchParams(id) : ""}`)
      }
      isClickable={isClickable}
      getItemClassName={getItemClassName}
      useInfoStyles
      showMoreMinCount={5}
      showMoreLabel={t("gameDetail.andMore", ", and more")}
    />
  );

  /** Platform IDs that appear in executable filenames (NN-label-platformId.ext). Used to highlight those platforms in yellow. */
  const platformIdsFromExecutables = useMemo(() => {
    const names = "executableFileNames" in game && Array.isArray(game.executableFileNames) ? game.executableFileNames : [];
    const set = new Set<string>();
    for (const fullName of names) {
      if (typeof fullName !== "string" || !fullName) continue;
      const baseNoExt = fullName.replace(/\.(sh|bat)$/i, "");
      const withoutPrefix = baseNoExt.replace(/^\d+-/, "");
      if (withoutPrefix.includes("-")) {
        const platformId = withoutPrefix.slice(withoutPrefix.lastIndexOf("-") + 1);
        if (platformId && /^\d+$/.test(platformId)) set.add(platformId);
      }
    }
    return set;
  }, ["executableFileNames" in game ? game.executableFileNames : null]);

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

  // Names from game payload for franchise/series (IGDB returns { id, name })
  const franchiseNamesFromGame = useMemo(() => {
    const m = new Map<string, string>();
    const raw = game.franchise;
    const arr = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
    for (const x of arr) {
      if (typeof x === "object" && x != null && "id" in x && "name" in x) {
        m.set(String((x as { id: number }).id), (x as { name: string }).name);
      }
    }
    return m;
  }, [game.franchise]);
  const seriesNamesFromGame = useMemo(() => {
    const m = new Map<string, string>();
    const raw = game.series ?? game.collection;
    const arr = raw == null ? [] : Array.isArray(raw) ? raw : [raw];
    for (const x of arr) {
      if (typeof x === "object" && x != null && "id" in x && "name" in x) {
        m.set(String((x as { id: number }).id), (x as { name: string }).name);
      }
    }
    return m;
  }, [game.series, game.collection]);

  // Names from game payload for tag fields (IGDB returns { id, name })
  const tagNamesFromGame = useMemo(() => {
    const themeMap = new Map<string, string>();
    const platformMap = new Map<string, string>();
    const gameModeMap = new Map<string, string>();
    const ppMap = new Map<string, string>();
    const engineMap = new Map<string, string>();
    const add = (arr: unknown[], map: Map<string, string>) => {
      if (!arr || !Array.isArray(arr)) return;
      for (const x of arr) {
        if (typeof x === "object" && x != null && "id" in x && "name" in x) {
          map.set(String((x as { id: number }).id), (x as { name: string }).name);
        }
      }
    };
    add(game.themes as unknown[], themeMap);
    add(game.platforms as unknown[], platformMap);
    add(game.gameModes as unknown[], gameModeMap);
    add(game.playerPerspectives as unknown[], ppMap);
    add(game.gameEngines as unknown[], engineMap);
    return { themeMap, platformMap, gameModeMap, ppMap, engineMap };
  }, [game.themes, game.platforms, game.gameModes, game.playerPerspectives, game.gameEngines]);

  const themeLinkInfo = useMemo(() => getTagLinkInfo(game.themes as unknown[]), [game.themes]);
  const platformLinkInfo = useMemo(() => getTagLinkInfo(game.platforms as unknown[]), [game.platforms]);
  const gameModeLinkInfo = useMemo(() => getTagLinkInfo(game.gameModes as unknown[]), [game.gameModes]);
  const playerPerspectiveLinkInfo = useMemo(
    () => getTagLinkInfo(game.playerPerspectives as unknown[]),
    [game.playerPerspectives]
  );
  const gameEngineLinkInfo = useMemo(() => getTagLinkInfo(game.gameEngines as unknown[]), [game.gameEngines]);

  return (
    <div className="game-info-block">

      {/* Themes */}
      {game.themes && game.themes.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("catalogInfo.themes", "Themes")}
          </div>
          {renderTagListByIds(
            themeLinkInfo.linkIds,
            "/themes",
            (id) => {
              const displayName =
                themeLinkInfo.hashToDisplayName.get(id) ??
                tagNamesFromGame.themeMap.get(id) ??
                tagLabels.themes.get(id) ??
                id;
              return t(`themes.${displayName}`, displayName);
            },
            themeLinkInfo.getSearchParams,
            (id) => tagLabels.themes.has(id)
          )}
        </div>
      )}

      {/* Platforms */}
      {game.platforms && game.platforms.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("catalogInfo.platforms", "Platforms")}
          </div>
          {renderTagListByIds(
            platformLinkInfo.linkIds,
            "/platforms",
            (id) => {
              const displayName =
                platformLinkInfo.hashToDisplayName.get(id) ??
                tagNamesFromGame.platformMap.get(id) ??
                tagLabels.platforms.get(id) ??
                id;
              return t(`platforms.${displayName}`, displayName);
            },
            platformLinkInfo.getSearchParams,
            (id) => tagLabels.platforms.has(id),
            (id) => (!platformIdsFromExecutables.has(id) ? "game-info-list-item--platform-no-executable" : undefined)
          )}
        </div>
      )}

      {/* Game Modes */}
      {game.gameModes && game.gameModes.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("catalogInfo.gameModes", "Game Modes")}
          </div>
          {renderTagListByIds(
            gameModeLinkInfo.linkIds,
            "/game-modes",
            (id) => {
              const displayName =
                gameModeLinkInfo.hashToDisplayName.get(id) ??
                tagNamesFromGame.gameModeMap.get(id) ??
                tagLabels.gameModes.get(id) ??
                id;
              return t(`gameModes.${displayName}`, displayName);
            },
            gameModeLinkInfo.getSearchParams,
            (id) => tagLabels.gameModes.has(id)
          )}
        </div>
      )}

      {/* Player Perspectives */}
      {game.playerPerspectives && game.playerPerspectives.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("catalogInfo.playerPerspectives", "Player Perspectives")}
          </div>
          {renderTagListByIds(
            playerPerspectiveLinkInfo.linkIds,
            "/player-perspectives",
            (id) => {
              const displayName =
                playerPerspectiveLinkInfo.hashToDisplayName.get(id) ??
                tagNamesFromGame.ppMap.get(id) ??
                tagLabels.playerPerspectives.get(id) ??
                id;
              return t(`playerPerspectives.${displayName}`, displayName);
            },
            playerPerspectiveLinkInfo.getSearchParams,
            (id) => tagLabels.playerPerspectives.has(id)
          )}
        </div>
      )}

      {/* Websites */}
      {game.websites && game.websites.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("catalogInfo.websites", "Websites")}
          </div>
          <WebsitesList websites={game.websites} />
        </div>
      )}

      {/* Developers (show name from game payload e.g. IGDB { id, name }, else from library context) */}
      {game.developers && game.developers.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("catalogInfo.developers", "Developers")}
          </div>
          <InlineTagList
            items={toIdStrings(game.developers)}
            getLabel={(id) => developerNamesFromGame.get(id) ?? developers.find((d) => String(d.id) === id)?.title ?? id}
            onItemClick={(value) =>
              navigate(`/developers/${encodeURIComponent(value)}`)
            }
            isClickable={(id) => developers.some((d) => String(d.id) === id)}
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
            {t("catalogInfo.publishers", "Publishers")}
          </div>
          <InlineTagList
            items={toIdStrings(game.publishers)}
            getLabel={(id) => publisherNamesFromGame.get(id) ?? publishers.find((p) => String(p.id) === id)?.title ?? id}
            onItemClick={(value) =>
              navigate(`/publishers/${encodeURIComponent(value)}`)
            }
            isClickable={(id) => publishers.some((p) => String(p.id) === id)}
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
            {t("catalogInfo.franchise", "Franchise")}
          </div>
          {renderTagListByIds(
            franchiseIds,
            "/franchise",
            (id) => franchiseNamesFromGame.get(id) ?? tagLabels.franchises.get(id) ?? id,
            undefined,
            (id) => tagLabels.franchises.has(id)
          )}
        </div>
      )}

      {/* Series (collection) */}
      {seriesIds.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("catalogInfo.series", "Series")}
          </div>
          {renderTagListByIds(
            seriesIds,
            "/series",
            (id) => seriesNamesFromGame.get(id) ?? tagLabels.series.get(id) ?? id,
            undefined,
            (id) => tagLabels.series.has(id)
          )}
        </div>
      )}

      {/* Game Engines */}
      {game.gameEngines && game.gameEngines.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("catalogInfo.gameEngines", "Game Engines")}
          </div>
          {renderTagListByIds(
            gameEngineLinkInfo.linkIds,
            "/game-engines",
            (id) => {
              const displayName =
                gameEngineLinkInfo.hashToDisplayName.get(id) ??
                tagNamesFromGame.engineMap.get(id) ??
                tagLabels.gameEngines.get(id) ??
                id;
              return t(`gameEngines.${displayName}`, displayName);
            },
            gameEngineLinkInfo.getSearchParams,
            (id) => tagLabels.gameEngines.has(id)
          )}
        </div>
      )}

      {/* Alternative Names */}
      {game.alternativeNames && game.alternativeNames.length > 0 && (
        <div className="game-info-field">
          <div className="text-white game-info-label">
            {t("catalogInfo.alternativeNames", "Alternative Names")}
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
    </div>
  );
}

