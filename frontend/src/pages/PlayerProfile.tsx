import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getPlayer } from "../api/api.ts";

import { ArrowLeft } from "lucide-react";

export default function PlayerProfile() {
  const { id } = useParams();
  const [player, setPlayer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayerData = async () => {
      if (id) {
        const data = await getPlayer(id);
        setPlayer(data);
      }
      setLoading(false);
    };
    fetchPlayerData();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-slate-950 p-10 text-white italic">Loading...</div>;
  if (!player) return <div className="min-h-screen bg-slate-950 p-10 text-white font-bold">Player not found.</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-10 text-white">
      <Link to="/players" className="flex items-center gap-2 text-slate-500 mb-8 hover:text-white transition-all">
        <ArrowLeft size={20} /> Back to Players
      </Link>
      <div className="max-w-4xl mx-auto bg-slate-900 p-10 rounded-[3rem] border border-slate-800">
        <h1 className="text-5xl font-black uppercase italic bg-gradient-to-r from-white to-blue-500 bg-clip-text text-transparent">
          {player.name}
        </h1>
        <p className="text-slate-500 mt-4">ID: {player.id}</p>
      </div>
    </div>
  );
}