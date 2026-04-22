import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatIGDBGameDate } from "../utils/date";
import { displayGameType } from "../utils/igdbGameType";
import { API_BASE, getApiToken, getTwitchClientId, getTwitchClientSecret } from "../config";
import type { IGDBGame } from "../types";
import Cover from "../components/games/Cover";
type AddGamePageProps = {
  onGameSelected: (game: IGDBGame) => void;
};

export default function AddGamePage({
  onGameSelected,
}: AddGamePageProps) {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<IGDBGame[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if query is too short (allow single character when it's a numeric IGDB ID)
    const trimmed = searchQuery.trim();
    const isNumericId = /^\d+$/.test(trimmed);
    if (trimmed.length < 2 && !isNumericId) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Debounce search
    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const url = new URL("/igdb/search", API_BASE);

        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Auth-Token": getApiToken(),
        };
        
        // Add Twitch credentials for IGDB API
        const clientId = getTwitchClientId();
        const clientSecret = getTwitchClientSecret();
        if (clientId) headers["X-Twitch-Client-Id"] = clientId;
        if (clientSecret) headers["X-Twitch-Client-Secret"] = clientSecret;

        const res = await fetch(url.toString(), {
          method: "POST",
          headers,
          body: JSON.stringify({ query: searchQuery.trim() }),
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        setResults(json.games || []);
        setError(null);
      } catch (err: any) {
        setError(String(err.message || err));
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  function handleGameSelect(game: IGDBGame) {
    onGameSelected(game);
    navigate("/");
  }

  return (
    <div className="bg-[#1a1a1a] text-white add-game-page-root">
      <div className="max-w-4xl mx-auto px-8 py-8">
        <div className="bg-[#1a1a1a] rounded-lg shadow-2xl overflow-hidden border border-[#2a2a2a] max-h-[80vh] flex flex-col">
          <div className="p-6 border-b border-[#2a2a2a] bg-[#0d0d0d]">
            <h2 className="text-2xl font-semibold text-white">Add Game</h2>
          </div>

          <div className="p-6 flex-1 overflow-hidden flex flex-col">
            <div className="mb-4">
              <input
                id="add-game-page-search"
                name="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a game..."
                className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#E5A00D] transition-colors"
                autoFocus
              />
            </div>

            {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}

            <div className="flex-1 overflow-y-auto">
              {isSearching ? (
                <div className="add-game-page-loading">
                  <div className="add-game-page-spinner" />
                  <div className="add-game-page-loading-text">{t("addGame.loading", "Searching...")}</div>
                </div>
              ) : results.length === 0 && searchQuery.trim().length >= 2 ? (
                <div className="text-center text-gray-400 py-8">
                  {t("table.noGames")}
                </div>
              ) : results.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                  {t("addGame.typeToSearch")}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {results.map((game) => {
                    const typeLabel =
                      game.type != null ? displayGameType(game.type) : "";
                    return (
                    <button
                      key={game.id}
                      onClick={() => handleGameSelect(game)}
                      className="flex items-center gap-4 p-4 bg-[#2a2a2a] rounded hover:bg-[#3a3a3a] transition-colors text-left"
                    >
                      <div className="shrink-0 w-20 [&_.games-list-cover]:rounded-lg">
                        <Cover
                          title={game.name}
                          coverUrl={game.cover || ""}
                          width={80}
                          height={120}
                          showTitle={false}
                          detail={false}
                          play={false}
                          showBorder={false}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <div className="text-white font-medium text-lg min-w-0">
                            {game.name}
                          </div>
                          {typeLabel ? (
                            <span className="inline-block shrink-0 px-2 py-1 rounded text-xs font-semibold bg-orange-500/15 border border-orange-500/45 text-orange-400 max-w-full truncate">
                              {typeLabel}
                            </span>
                          ) : null}
                        </div>
                        {formatIGDBGameDate(game, t, i18n) && (
                          <div className="text-gray-400 text-sm mb-2">
                            {formatIGDBGameDate(game, t, i18n)}
                          </div>
                        )}
                        {game.summary && (
                          <div className="text-gray-300 text-sm line-clamp-2 whitespace-pre-line">
                            {game.summary}
                          </div>
                        )}
                      </div>
                    </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
