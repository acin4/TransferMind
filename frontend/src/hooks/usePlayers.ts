import { useEffect, useState } from "react";
import {
  getPlayers,
  type PaginatedResponse,
  type PlayerListItem,
} from "../api/api";

type UsePlayersResult = {
  players: PlayerListItem[];
  pagination: PaginatedResponse<PlayerListItem> | null;
  isLoading: boolean;
  error: string | null;
};

export function usePlayers(): UsePlayersResult {
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [pagination, setPagination] =
    useState<PaginatedResponse<PlayerListItem> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPlayers = async () => {
      try {
        const data = await getPlayers({ page: 1, limit: 20 });

        if (cancelled) {
          return;
        }

        setPlayers(data.data || []);
        setPagination(data);
        setError(null);
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        console.error(fetchError);
        setPlayers([]);
        setPagination(null);
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

  return { players, pagination, isLoading, error };
}
