import { useEffect, useState } from "react";
import { getTeams, type TeamListItem } from "../api/api";

type UseTeamsResult = {
  teams: TeamListItem[];
  isLoading: boolean;
  error: string | null;
};

export function useTeams(): UseTeamsResult {
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchTeams = async () => {
      try {
        const fetchedTeams = await getTeams();

        if (cancelled) {
          return;
        }

        setTeams(fetchedTeams || []);
        setError(null);
      } catch (fetchError) {
        if (cancelled) {
          return;
        }

        console.error("Σφάλμα κατά τη φόρτωση λίστας ομάδων:", fetchError);
        setTeams([]);
        setError("Failed to load teams.");
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchTeams();

    return () => {
      cancelled = true;
    };
  }, []);

  return { teams, isLoading, error };
}
