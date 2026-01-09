import { useEffect, useRef } from "react";
import type { GameItem } from "../types";

type GameEventType = "gameUpdated" | "gameDeleted" | "gameAdded";

interface UseGameEventsOptions {
  /**
   * Function to update the games state
   */
  setGames: React.Dispatch<React.SetStateAction<GameItem[]>>;
  /**
   * Array of event types to listen to
   */
  enabledEvents?: GameEventType[];
}

/**
 * Hook to listen to global game events and update local games state
 * 
 * @param options - Configuration options
 * @param options.setGames - Function to update the games state
 * @param options.enabledEvents - Array of event types to listen to (default: all events)
 * 
 * @example
 * ```tsx
 * const [games, setGames] = useState<GameItem[]>([]);
 * useGameEvents({ setGames, enabledEvents: ["gameUpdated", "gameDeleted"] });
 * ```
 */
export function useGameEvents({ setGames, enabledEvents = ["gameUpdated", "gameDeleted", "gameAdded"] }: UseGameEventsOptions) {
  const enabledEventsRef = useRef(enabledEvents);
  enabledEventsRef.current = enabledEvents;

  useEffect(() => {
    const handlers: Array<{ event: string; handler: EventListener }> = [];

    if (enabledEventsRef.current.includes("gameUpdated")) {
      const handleGameUpdated = (event: Event) => {
        const customEvent = event as CustomEvent<{ game: GameItem }>;
        const updatedGame = customEvent.detail?.game;
        if (updatedGame) {
          setGames((prevGames) =>
            prevGames.map((game) =>
              String(game.id) === String(updatedGame.id) ? updatedGame : game
            )
          );
        }
      };
      window.addEventListener("gameUpdated", handleGameUpdated as EventListener);
      handlers.push({ event: "gameUpdated", handler: handleGameUpdated as EventListener });
    }

    if (enabledEventsRef.current.includes("gameDeleted")) {
      const handleGameDeleted = (event: Event) => {
        const customEvent = event as CustomEvent<{ gameId: string }>;
        const deletedGameId = customEvent.detail?.gameId;
        if (deletedGameId) {
          setGames((prevGames) =>
            prevGames.filter((game) => String(game.id) !== String(deletedGameId))
          );
        }
      };
      window.addEventListener("gameDeleted", handleGameDeleted as EventListener);
      handlers.push({ event: "gameDeleted", handler: handleGameDeleted as EventListener });
    }

    if (enabledEventsRef.current.includes("gameAdded")) {
      const handleGameAdded = (event: Event) => {
        const customEvent = event as CustomEvent<{ game: GameItem }>;
        const addedGame = customEvent.detail?.game;
        if (addedGame) {
          setGames((prevGames) => {
            // Ensure id is a string (matching the format from API)
            const gameToAdd: GameItem = {
              ...addedGame,
              id: String(addedGame.id),
            };
            
            // Check if game already exists (avoid duplicates)
            const existingIndex = prevGames.findIndex((g) => String(g.id) === String(gameToAdd.id));
            if (existingIndex >= 0) {
              // Update existing game
              const updated = [...prevGames];
              updated[existingIndex] = gameToAdd;
              return updated;
            } else {
              // Add new game
              return [...prevGames, gameToAdd];
            }
          });
        }
      };
      window.addEventListener("gameAdded", handleGameAdded as EventListener);
      handlers.push({ event: "gameAdded", handler: handleGameAdded as EventListener });
    }

    return () => {
      handlers.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler);
      });
    };
  }, [setGames]);
}

