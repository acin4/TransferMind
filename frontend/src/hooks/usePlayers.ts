import { useEffect, useState } from "react";
import { getPlayers, type PlayerListItem } from "../api/api";

type UsePlayersResult = {
  players: PlayerListItem[];
  isLoading: boolean;
  error: string | null;
};

export function usePlayers(): UsePlayersResult {
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPlayers = async () => {
      try {
        const data = await getPlayers();

        if (cancelled) {
          return;
        }

        setPlayers(data || []);
        setError(null);
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        console.error(fetchError);
        setPlayers([]);
        setError("Failed to load players.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchPlayers();

    return () => {
      cancelled = true;
    };
  }, []);

  return { players, isLoading, error };
}
