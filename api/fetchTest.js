// api/fetchTest.js
const { client } = require("./client");
const { saveJSON } = require("./utils");

(async () => {
  try {
    // Πάρε όλες τις κατηγορίες για ποδόσφαιρο
    const res = await client.get("/categories/list", {
      params: { sport: "football" },
    });

    const data = res.data;
    const isArray = Array.isArray(data);
    console.log("✅ OK.");
    console.log("Type:", isArray ? "array" : typeof data);
    console.log(
      isArray ? `Length: ${data.length}` : `Keys: ${Object.keys(data)}`
    );

    // Σώσε raw για να το δούμε με την ησυχία μας
    saveJSON("data/raw/sofascore_categories.json", data);

    // Προσπάθησε να βγάλεις έναν μικρό πίνακα με tournaments (αν υπάρχει αυτό το μοτίβο)
    let tournaments = [];
    if (!isArray && Array.isArray(data?.categories)) {
      tournaments = data.categories.flatMap((c) => c.tournaments || []);
    } else if (isArray) {
      // σε μερικές παραλλαγές, το API δίνει απευθείας array από categories/tournaments
      tournaments = data.flatMap((c) => c.tournaments || []);
    }

    if (tournaments.length) {
      const mini = tournaments.map((t) => ({
        id: t.id ?? t.tournament?.id ?? null,
        name: t.name ?? t.tournament?.name ?? null,
        slug: t.slug ?? t.tournament?.slug ?? null,
        uniqueTournamentId: t.uniqueTournament?.id ?? null,
      }));
      saveJSON("data/raw/sofascore_tournaments_min.json", mini);
      console.log(`📦 Extracted tournaments: ${mini.length}`);
    } else {
      console.log("ℹ️ No tournaments array found in this response shape.");
    }
  } catch (e) {
    console.error("❌ Error:", e.response?.data || e.message);
  }
})();
