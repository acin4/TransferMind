import { useState, useEffect } from "react";
import { 
  Search, Trophy, User, Table2, Shield, Brain, 
  ChevronRight, Activity, X, LineChart, Database 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getSearchResults,
  type SearchPlayerResult,
  type SearchTeamResult,
} from "../api/api";
import { filterAndRankSearchResults } from "../utils/search";
import { formatPlayerHeight } from "../utils/playerDisplay";

// Home is the app's landing page. It combines the brand header, global
// team/player search, quick navigation cards, hover previews, and an About modal.
export default function Home() {
  // query stores the text the user types into the search input.
  const [query, setQuery] = useState("");
  // players and teams store search results separately so the dropdown can render
  // them in two different sections with different icons and routes.
  const [players, setPlayers] = useState<SearchPlayerResult[]>([]);
  const [teams, setTeams] = useState<SearchTeamResult[]>([]);
  // error stores a user-facing search error message when the backend request fails.
  const [error, setError] = useState<string | null>(null);
  // activePreview tracks which quick-link card is hovered or focused.
  const [activePreview, setActivePreview] = useState<QuickLinkPreviewId | null>(
    null,
  );
  
  // 🟢 ΝΕΟ STATE ΓΙΑ ΤΟ POP-UP
  // isAboutOpen controls whether the platform explanation modal is visible.
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  
  // useNavigate lets click handlers move the user to other app pages.
  const navigate = useNavigate();

  // Search effect: runs whenever query changes and refreshes the dropdown data.
  useEffect(() => {
    // Trim spaces so a search containing only whitespace behaves like empty input.
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      // Empty query means no dropdown data should be shown.
      setPlayers([]);
      setTeams([]);
      setError(null);
      return;
    }

    // This flag stops stale async work from updating state after a newer search.
    let cancelled = false;
    const fetchData = async () => {
      try {
        // Ask the backend for matching teams and players.
        const results = await getSearchResults(trimmedQuery);

        if (!cancelled) {
          // Rank/filter player results so stronger text matches appear first.
          setPlayers(
            filterAndRankSearchResults(
              results?.players ?? [],
              trimmedQuery,
              getSearchPlayerFields,
            ),
          );
          // Rank/filter team results separately from player results.
          setTeams(
            filterAndRankSearchResults(
              results?.teams ?? [],
              trimmedQuery,
              getSearchTeamFields,
            ),
          );
          setError(null);
        }
      } catch (err) {
        // Log the real error for developers, then show a simple UI message.
        console.error(err);
        if (cancelled) {
          return;
        }
        setPlayers([]);
        setTeams([]);
        setError("Αδυναμία φόρτωσης δεδομένων.");
      }
    };

    // Debounce search by 300ms to avoid a backend request for every keystroke.
    const timeoutId = window.setTimeout(fetchData, 300);

    return () => {
      // Cleanup prevents old requests or timeouts from writing stale results.
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [query]);

  return (
    // Full-page container: centers the homepage content, sets the dark theme, and
    // prevents horizontal overflow from decorative hover/preview elements.
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 font-sans relative py-32 text-slate-100 overflow-x-hidden">
      
      {/* ΚΕΝΤΡΙΚΟΣ ΤΙΤΛΟΣ ΚΑΙ ΥΠΟΤΙΤΛΟΣ */}
      {/* Hero header: gives the landing page its brand identity before the user
          starts searching or navigating. */}
      <div className="text-center mb-16 w-full max-w-4xl relative z-20">
        <h1 className="text-7xl md:text-8xl font-black mb-6 tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl italic uppercase">
          TransferMind
        </h1>
        <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto uppercase tracking-widest">
          The Ultimate Professional Scouting & Analytics Network
        </p>
      </div>

      {/* SEARCH BAR ΚΟΝΤΕΙΝΕΡ */}
      {/* Search area: positioned relative so the dropdown can sit directly under
          the input. */}
      <div className="w-full max-w-3xl relative z-30 flex flex-col items-center">
        <div className="relative w-full group">
          {/* Soft gradient glow behind the search box. It becomes stronger on hover. */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-[2.5rem] blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
          
          <div className="relative flex items-center w-full bg-slate-100 rounded-[2rem] p-2 shadow-2xl">
            <input
              type="text"
              // Controlled input: query state is the single source of truth.
              value={query}
              // Updating query triggers the debounced search effect above.
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Αναζήτηση ομάδας ή παίκτη..."
              className="w-full py-6 px-10 text-center text-xl md:text-2xl font-bold bg-transparent border-none focus:ring-0 outline-none text-slate-900 placeholder-slate-400 focus:placeholder-transparent"
            />
            {/* Decorative search icon badge on the right side of the input. */}
            <div className="absolute right-4 p-4 bg-blue-600 rounded-full text-white shadow-lg">
               <Search size={28} />
            </div>
          </div>
        </div>

        {/* RESULTS DROPDOWN */}
        {/* The dropdown appears whenever the input has text. Results are grouped
            by type so teams and players can navigate to different pages. */}
        {query && (
          <div className="absolute top-[110%] left-0 w-full mt-4 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-[2rem] shadow-2xl max-h-[400px] overflow-y-auto z-50 custom-scrollbar">
            {players.length === 0 && teams.length === 0 && (
              // Empty state for a search that has no visible matches.
              <div className="p-12 text-center text-slate-500 font-medium text-lg uppercase tracking-widest italic">
                Δεν βρέθηκαν αποτελέσματα για "{query}"
              </div>
            )}

            {teams.length > 0 && (
              // Team results navigate to the team profile route.
              <div className="p-6">
                <h3 className="text-xs font-black text-center text-slate-500 uppercase tracking-[0.3em] px-4 pb-4 pt-2">Ομαδες</h3>
                {teams.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/team/${t.id}`)}
                    className="flex items-center gap-5 p-4 rounded-2xl hover:bg-slate-800/80 cursor-pointer transition-all border border-transparent hover:border-slate-700 group"
                  >
                    {/* Icon block helps users distinguish team results from players. */}
                    <div className="bg-blue-500/10 p-3 rounded-xl text-blue-400 group-hover:scale-110 transition-transform">
                      <Trophy size={24} />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate font-black italic uppercase text-slate-200 text-xl group-hover:text-blue-400 transition-colors">{t.name}</span>
                      {getTeamSearchContext(t) && (
                        <span className="mt-1 block truncate text-xs font-bold uppercase tracking-widest text-slate-500">
                          {getTeamSearchContext(t)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {teams.length > 0 && players.length > 0 && (
              // Divider shown only when both result sections are present.
              <div className="h-px bg-slate-800/50 mx-8 my-2"></div>
            )}

            {players.length > 0 && (
              // Player results navigate to the player profile route.
              <div className="p-6">
                <h3 className="text-xs font-black text-center text-slate-500 uppercase tracking-[0.3em] px-4 pb-4 pt-2">Παικτες</h3>
                {players.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/player/${p.id}`)}
                    className="flex items-center gap-5 p-4 rounded-2xl hover:bg-slate-800/80 cursor-pointer transition-all border border-transparent hover:border-slate-700 group"
                  >
                    {/* Purple icon block visually separates player rows from team rows. */}
                    <div className="bg-purple-500/10 p-3 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                      <User size={24} />
                    </div>
                    <div className="min-w-0">
                      <span className="block truncate font-bold italic uppercase text-slate-300 text-xl group-hover:text-purple-400 transition-colors">{p.name}</span>
                      <span className="mt-1 block truncate text-xs font-bold uppercase tracking-widest text-slate-500">
                        {p.teamName ?? "-"}
                      </span>
                      <span className="mt-1 block truncate text-xs font-bold uppercase tracking-widest text-slate-500">
                        Position: {p.position ?? "-"}
                      </span>
                      <span className="mt-1 block truncate text-xs font-bold uppercase tracking-widest text-slate-500">
                        Height: {formatPlayerHeight(p.height)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-6 text-center text-sm font-bold uppercase tracking-widest text-rose-400 relative z-30">
          {error}
        </div>
      )}

      {/* QUICK LINKS & ΕΠΕΞΗΓΗΣΗ ΠΛΑΤΦΟΡΜΑΣ */}
      {/* Quick links grid: each card either navigates to a feature page or opens
          the About modal. On desktop, preview panels appear above the cards. */}
      <div className="w-full max-w-6xl mt-14 grid grid-cols-1 gap-7 md:grid-cols-3 md:items-end relative z-10">
        
        {/* CARD 1: STANDINGS */}
        <div className="flex flex-col gap-4">
        <QuickLinkPreview
          previewId={activePreview === "standings" ? "standings" : null}
        />
        <button 
          // Navigate to the standings page when the card is clicked.
          onClick={() => navigate('/standings')}
          // Focus and hover both activate the preview for keyboard and mouse users.
          onFocus={() => setActivePreview("standings")}
          onMouseEnter={() => setActivePreview("standings")}
          onMouseLeave={() => setActivePreview(null)}
          onBlur={() => setActivePreview(null)}
          className="group relative min-h-[245px] w-full text-left bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-9 rounded-[2.5rem] hover:bg-slate-800/50 hover:border-blue-500 hover:-translate-y-2 transition-all duration-300 shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70"
        >
          <div className="bg-blue-500/10 w-16 h-16 flex items-center justify-center rounded-2xl mb-7 group-hover:bg-blue-500 transition-colors duration-300">
            <Table2 size={28} className="text-blue-400 group-hover:text-white transition-colors" />
          </div>
          <h2 className="text-2xl font-black italic uppercase text-slate-100 mb-4 flex items-center justify-between">
            Standings <ChevronRight size={20} className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            Παρακολούθησε ζωντανά τη βαθμολογία, τους πόντους και την ακριβή κατάταξη των κορυφαίων συλλόγων.
          </p>
        </button>
        </div>

        {/* CARD 2: TEAM ANALYTICS */}
        <div className="flex flex-col gap-4">
        <QuickLinkPreview
          previewId={activePreview === "teams" ? "teams" : null}
        />
        <button 
          // Navigate to the teams page when the card is clicked.
          onClick={() => navigate('/teams')}
          onFocus={() => setActivePreview("teams")}
          onMouseEnter={() => setActivePreview("teams")}
          onMouseLeave={() => setActivePreview(null)}
          onBlur={() => setActivePreview(null)}
          className="group relative min-h-[245px] w-full text-left bg-slate-900/40 backdrop-blur-sm border border-slate-800 p-9 rounded-[2.5rem] hover:bg-slate-800/50 hover:border-purple-500 hover:-translate-y-2 transition-all duration-300 shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/70"
        >
          <div className="bg-purple-500/10 w-16 h-16 flex items-center justify-center rounded-2xl mb-7 group-hover:bg-purple-500 transition-colors duration-300">
            <Shield size={28} className="text-purple-400 group-hover:text-white transition-colors" />
          </div>
          <h2 className="text-2xl font-black italic uppercase text-slate-100 mb-4 flex items-center justify-between">
            Team Stats <ChevronRight size={20} className="text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed">
            Βαθιά ανάλυση ομάδων. Εξερεύνησε επιθετικά στατιστικά, αμυντικές επιδόσεις και ποσοστά.
          </p>
        </button>

        {/* CARD 3: ABOUT (Πλέον είναι κουμπί που ανοίγει το Pop-Up) */}
        </div>
        <div className="flex flex-col gap-4">
        <QuickLinkPreview
          previewId={activePreview === "platform" ? "platform" : null}
        />
        <button 
          // This card opens a modal instead of navigating away from the home page.
          onClick={() => setIsAboutOpen(true)}
          onFocus={() => setActivePreview("platform")}
          onMouseEnter={() => setActivePreview("platform")}
          onMouseLeave={() => setActivePreview(null)}
          onBlur={() => setActivePreview(null)}
          className="group relative min-h-[245px] w-full overflow-visible text-left bg-gradient-to-br from-slate-900/80 to-slate-900/20 backdrop-blur-sm border border-slate-800 p-9 rounded-[2.5rem] hover:border-emerald-500 hover:-translate-y-2 transition-all duration-300 shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
        >
          {/* Oversized low-opacity icon is decorative and sits behind the card text. */}
          <Brain size={120} className="absolute bottom-0 right-0 text-white/[0.03] rotate-12 group-hover:text-emerald-500/10 transition-colors duration-500" />
          
          <div className="bg-emerald-500/10 w-16 h-16 flex items-center justify-center rounded-2xl mb-7 relative z-10 group-hover:bg-emerald-500 transition-colors duration-300">
            <Activity size={28} className="text-emerald-400 group-hover:text-white transition-colors" />
          </div>
          <h2 className="text-2xl font-black italic uppercase text-slate-100 mb-4 flex items-center justify-between relative z-10">
            Η Πλατφορμα <ChevronRight size={20} className="text-slate-600 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
          </h2>
          <p className="text-slate-400 text-sm font-medium leading-relaxed relative z-10">
            Πάτησε εδώ για να ανακαλύψεις τις δυνατότητες του TransferMind και πώς λειτουργεί η ανάλυση δεδομένων μας.
          </p>
        </button>
        </div>
      </div>

      {/* 🟢 ΤΟ POP-UP (MODAL) ΤΗΣ ΠΛΑΤΦΟΡΜΑΣ */}
      {/* Modal is conditionally rendered only while isAboutOpen is true. */}
      {isAboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Σκοτεινό background - όταν πατάς έξω, κλείνει */}
          <div 
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            // Clicking the backdrop closes the modal.
            onClick={() => setIsAboutOpen(false)}
          ></div>
          
          {/* Το κυρίως παραθυράκι */}
          <div className="relative bg-slate-900 border border-slate-700 rounded-[3rem] p-8 md:p-12 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300">
            
            {/* Κουμπί κλεισίματος (X) */}
            <button 
              // Close button gives users an obvious way to dismiss the modal.
              onClick={() => setIsAboutOpen(false)}
              className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-rose-500 transition-colors"
            >
              <X size={24} />
            </button>

            <h2 className="text-3xl md:text-4xl font-black italic uppercase text-white mb-2">
              Τι ειναι το TransferMind;
            </h2>
            <p className="text-slate-400 mb-10 font-medium">
              Το απόλυτο εργαλείο στατιστικής ανάλυσης για scouters, αναλυτές και οπαδούς.
            </p>

            {/* Τα 3 Χαρακτηριστικά (Features) */}
            {/* Feature list uses repeated icon + text rows so the platform summary
                is easy to scan inside the modal. */}
            <div className="space-y-6">
              
              {/* Feature 1 */}
              <div className="flex items-start gap-5 p-4 bg-slate-800/30 rounded-3xl border border-slate-800">
                <div className="bg-blue-500/20 p-4 rounded-2xl">
                  <Table2 size={28} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Άμεση Βαθμολογία</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Δες πού βρίσκεται η αγαπημένη σου ομάδα σε πραγματικό χρόνο, με απόλυτη ακρίβεια σε πόντους και θέσεις.
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-5 p-4 bg-slate-800/30 rounded-3xl border border-slate-800">
                <div className="bg-purple-500/20 p-4 rounded-2xl">
                  <LineChart size={28} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Προηγμένα Στατιστικά (xG)</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Δεν βλέπουμε μόνο τα γκολ. Αναλύουμε επιθέσεις, άμυνες, μονομαχίες εδάφους και αέρα για πλήρη εικόνα του γηπέδου.
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-5 p-4 bg-slate-800/30 rounded-3xl border border-slate-800">
                <div className="bg-emerald-500/20 p-4 rounded-2xl">
                  <Database size={28} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">Τεράστια Βάση Δεδομένων</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Χιλιάδες παίκτες και ομάδες στο δάχτυλό σου, μέσω της γρήγορης και έξυπνης αναζήτησης του TransferMind.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Fields used by filterAndRankSearchResults when ranking team matches.
// Keeping this small helper separate makes it easy to add more searchable team
// fields later without changing the effect logic.
function getSearchTeamFields(team: SearchTeamResult) {
  return [team.name];
}

// Fields used by filterAndRankSearchResults when ranking player matches.
function getSearchPlayerFields(player: SearchPlayerResult) {
  return [player.name];
}

// Builds the smaller context line shown under a team search result.
// It combines location, stadium, tournament, and season details when available.
function getTeamSearchContext(team: SearchTeamResult) {
  return joinSearchContext([
    team.country,
    team.city,
    team.stadium,
    team.tournamentName,
    team.seasonName,
  ]);
}

// Cleans and combines optional context values for result subtitles.
// It removes empty values, removes duplicates with Set, limits the result to
// three parts, and joins them with " / " for compact display.
function joinSearchContext(values: Array<string | null | undefined>) {
  const uniqueValues = values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return [...new Set(uniqueValues)].slice(0, 3).join(" / ");
}

type QuickLinkPreviewId = "standings" | "teams" | "platform";

// Configuration object for the quick-link preview cards.
// Storing preview text and classes here keeps QuickLinkPreview generic and avoids
// repeating the same JSX for every card type.
const QUICK_LINK_PREVIEWS: Record<
  QuickLinkPreviewId,
  {
    title: string;
    description: string;
    accentClassName: string;
    borderClassName: string;
    shadowClassName: string;
    primaryChipClassName: string;
    chips: string[];
  }
> = {
  standings: {
    title: "Live League Table",
    description:
      "Rankings, points, wins, goal difference, and filtered standings by competition.",
    accentClassName: "text-blue-300",
    borderClassName: "border-blue-500/20",
    shadowClassName: "shadow-blue-950/30",
    primaryChipClassName: "bg-blue-500/10 text-blue-200",
    chips: ["Rank", "Points", "Form"],
  },
  teams: {
    title: "Team Profiles",
    description:
      "Club pages with season stats, relative bars, squad data, and ranking charts.",
    accentClassName: "text-purple-300",
    borderClassName: "border-purple-500/20",
    shadowClassName: "shadow-purple-950/30",
    primaryChipClassName: "bg-purple-500/10 text-purple-200",
    chips: ["Stats", "Squad", "Charts"],
  },
  platform: {
    title: "Platform Overview",
    description:
      "A compact explanation of TransferMind data, analysis flow, and thesis features.",
    accentClassName: "text-emerald-300",
    borderClassName: "border-emerald-500/20",
    shadowClassName: "shadow-emerald-950/30",
    primaryChipClassName: "bg-emerald-500/10 text-emerald-200",
    chips: ["Data", "Model", "Scope"],
  },
};

// Small preview panel shown above a quick-link card on desktop.
// The parent passes the active preview id based on hover/focus state.
function QuickLinkPreview({
  previewId,
}: {
  previewId: QuickLinkPreviewId | null;
}) {
  // Null means no card is active, so the preview panel renders hidden/transparent.
  const preview = previewId ? QUICK_LINK_PREVIEWS[previewId] : null;

  return (
    // pointer-events-none keeps the preview from blocking hover/click behavior on
    // the actual cards. hidden md:block removes it on small screens.
    <div className="pointer-events-none hidden h-52 w-full md:block">
      <div
        // The panel animates in when preview exists and fades/slides out when null.
        className={`h-full rounded-[2rem] border bg-slate-950/95 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 ${
          preview
            ? "translate-y-0 opacity-100"
            : "translate-y-3 opacity-0"
        } ${preview?.borderClassName ?? "border-slate-800"} ${
          preview?.shadowClassName ?? "shadow-slate-950/30"
        }`}
      >
        {/* Render preview content only when a quick-link is active. */}
        {preview ? (
          <>
            <p
              className={`text-[11px] font-black uppercase tracking-[0.3em] ${preview.accentClassName}`}
            >
              Preview
            </p>
            <h3 className="mt-3 text-xl font-black uppercase italic text-white">
              {preview.title}
            </h3>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-400">
              {preview.description}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-2.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">
              {preview.chips.map((chip, index) => (
                // The first chip uses the accent color so the preview matches
                // the active card's theme.
                <span
                  key={chip}
                  className={`rounded-2xl px-2.5 py-2.5 ${
                    index === 0 ? preview.primaryChipClassName : "bg-slate-900"
                  }`}
                >
                  {chip}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
