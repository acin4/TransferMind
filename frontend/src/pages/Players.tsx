import { useEffect, useState } from "react";
import { getPlayers } from "../api/api";
import { Link } from "react-router-dom";

export default function Players() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const data = await getPlayers();
        setPlayers(data);
        setError(null);
      } catch (err) {
        console.error(err);
        setPlayers([]);
        setError("Failed to load players.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, []);

  if (loading) {
    return <div className="p-6">Loading players...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Players</h1>

      {error && (
        <div className="mb-4 text-sm font-bold text-rose-400">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {players.map((p) => {
          const stats = p.player_stats?.[0]; // take first stats row

          return (
            <Link key={p.id} to={`/player/${p.id}`}>
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white p-4 rounded-2xl shadow-lg hover:scale-105 transition">
                
                <h2 className="text-lg font-semibold">{p.name}</h2>

                <p className="text-sm text-gray-400">
                  Team ID: {p.team_id}
                </p>

                <p className="text-sm">
                  Height: {p.height ?? "-"} cm
                </p>

                {stats && (
                  <div className="mt-3 text-sm">
                    <p>⚽ Goals: {stats.goals}</p>
                    <p>🎯 Assists: {stats.assists}</p>
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
