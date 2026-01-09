import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatIGDBGameDate } from "../utils/date";
import { API_BASE, getApiToken, getTwitchClientId, getTwitchClientSecret } from "../config";
import type { IGDBGame } from "../types";

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

    // Don't search if query is too short
    if (searchQuery.trim().length < 2) {
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
    <div
      className="bg-[#1a1a1a] text-white"
      style={{
        width: "100%",
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
      }}
    >
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
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid rgba(255, 255, 255, 0.1)',
                    borderTopColor: '#FFB300',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite',
                    marginBottom: '16px'
                  }}></div>
                  <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{t("addGame.loading", "Searching...")}</div>
                  <style>{`
                    @keyframes spin {
                      to { transform: rotate(360deg); }
                    }
                  `}</style>
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
                  {results.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => handleGameSelect(game)}
                      className="flex items-center gap-4 p-4 bg-[#2a2a2a] rounded hover:bg-[#3a3a3a] transition-colors text-left"
                    >
                      {game.cover ? (
                        <img
                          src={game.cover}
                          alt={game.name}
                          className="w-20 h-28 object-cover rounded flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <div className="w-20 h-28 bg-[#1a1a1a] rounded flex items-center justify-center flex-shrink-0">
                          <div className="text-gray-500 text-2xl">🎮</div>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium text-lg mb-1">
                          {game.name}
                        </div>
                        {formatIGDBGameDate(game, t, i18n) && (
                          <div className="text-gray-400 text-sm mb-2">
                            {formatIGDBGameDate(game, t, i18n)}
                          </div>
                        )}
                        {game.summary && (
                          <div className="text-gray-300 text-sm line-clamp-2">
                            {game.summary}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
