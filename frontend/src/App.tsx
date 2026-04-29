import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/layout/Navbar"; 
import Home from "./pages/Home";
import Standings from "./pages/Standings";
import TeamProfile from "./pages/TeamProfile"; // 🟢 ΑΥΤΟ ΕΛΕΙΠΕ ΛΟΓΙΚΑ!
import PlayerProfile from "./pages/PlayerProfile";
import Players from "./pages/Players";
import Teams from "./pages/Teams";
import TeamsComparison from "./pages/TeamsComparison";

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-slate-950 font-sans text-slate-100">
        <Navbar />
        <main className="pt-24">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/standings" element={<Standings />} />
            {/* Αν λείπει το import πάνω, αυτό εδώ θα χτυπάει: */}
            <Route path="/team/:id" element={<TeamProfile />} /> 
            <Route path="/player/:id" element={<PlayerProfile />} />
            <Route path="/players" element={<Players />} />
            <Route path="/teams-comparison" element={<TeamsComparison />} />
            <Route path="/teams" element={<Teams />} />
          </Routes>
        </main>
        <footer className="pointer-events-none fixed bottom-3 right-4 z-50 text-right text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500/80 sm:bottom-4 sm:right-6">
          Designed by Konstantinos Peristerakis | Konstantinos Pantenas
        </footer>
      </div>
    </Router>
  );
}

export default App;
