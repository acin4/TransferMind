import { useEffect, useState } from "react";
import { getPlayerTeamSquads, type PlayerTeamSquad } from "../api/api";

type UsePlayerTeamSquadsResult = {
  squads: PlayerTeamSquad[];
  isLoading: boolean;
  error: string | null;
};

export function usePlayerTeamSquads(): UsePlayerTeamSquadsResult {
  const [squads, setSquads] = useState<PlayerTeamSquad[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSquads = async () => {
      try {
        const data = await getPlayerTeamSquads();

        if (cancelled) {
          return;
        }

        setSquads(data || []);
        setError(null);
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        console.error(fetchError);
        setSquads([]);
        setError("Failed to load player squads.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchSquads();

    return () => {
      cancelled = true;
    };
  }, []);

  return { squads, isLoading, error };
}
