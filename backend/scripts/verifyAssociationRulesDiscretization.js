import assert from "node:assert/strict";
import { buildTeamAssociationRuleTransactions } from "../services/teamAssociationRulesDiscretization.js";

const sampleRows = [
  {
    team_id: 1,
    team_api_id: 101,
    team_name: "Alpha FC",
    team_logo: "https://example.test/alpha.png",
    tournament_id: 10,
    tournament_api_id: 1001,
    tournament_name: "League",
    season_id: 100,
    season_api_id: 2001,
    season_name: "2025/26",
    stats: {
      goals_scored: 0,
      fouls: 20,
      shots: "",
      pass_total: 100,
      redcards: null,
    },
  },
  {
    team_id: 2,
    team_api_id: 102,
    team_name: "Beta FC",
    team_logo: null,
    tournament_id: 10,
    tournament_api_id: 1001,
    tournament_name: "League",
    season_id: 100,
    season_api_id: 2001,
    season_name: "2025/26",
    stats: {
      goals_scored: "15",
      fouls: "10",
      shots: "not-a-number",
      pass_total: 100,
      redcards: undefined,
    },
  },
  {
    team_id: 3,
    team_api_id: 103,
    team_name: "Gamma FC",
    team_logo: null,
    tournament_id: 10,
    tournament_api_id: 1001,
    tournament_name: "League",
    season_id: 100,
    season_api_id: 2001,
    season_name: "2025/26",
    stats: {
      goals_scored: 30,
      fouls: 0,
      shots: Number.POSITIVE_INFINITY,
      pass_total: 100,
      redcards: "",
    },
  },
];

const selectedStatKeys = [
  "goals_scored",
  "fouls",
  "shots",
  "pass_total",
  "redcards",
];
const result = buildTeamAssociationRuleTransactions(
  sampleRows,
  selectedStatKeys,
);

assert.equal(result.transactions.length, 3);
assert.deepEqual(result.transactions.map((transaction) => transaction.items), [
  [
    "goals_scored_low",
    "fouls_low",
    "shots_low",
    "pass_total_low",
    "redcards_high",
  ],
  [
    "goals_scored_medium",
    "fouls_medium",
    "shots_low",
    "pass_total_low",
    "redcards_high",
  ],
  [
    "goals_scored_high",
    "fouls_high",
    "shots_low",
    "pass_total_low",
    "redcards_high",
  ],
]);
for (const transaction of result.transactions) {
  assert.deepEqual(
    transaction.items.map((item) => item.replace(/_(low|medium|high)$/, "")),
    selectedStatKeys,
  );
}
assert.deepEqual(result.transactions[1].rawStats, {
  goals_scored: 15,
  fouls: 10,
  shots: 0,
  pass_total: 100,
  redcards: 0,
});
assert.equal(result.transactions[0].adjustedStats.fouls, 0);
assert.equal(result.transactions[1].adjustedStats.fouls, 0.5);
assert.equal(result.transactions[2].adjustedStats.fouls, 1);
assert.equal(result.transactions[0].adjustedStats.pass_total, 0);
assert.equal(result.transactions[0].bins.pass_total, "low");
assert.equal(result.transactions[0].adjustedStats.redcards, 1);
assert.equal(result.transactions[0].bins.redcards, "high");
assert.equal(
  result.stats.find((stat) => stat.key === "pass_total").isConstant,
  true,
);
assert.equal(
  result.stats.find((stat) => stat.key === "redcards").direction,
  "negative",
);
assert.ok(
  result.warnings.some((warning) =>
    warning.includes("Total Passes is constant"),
  ),
);
assert.ok(
  result.warnings.some((warning) =>
    warning.includes("Red Cards is constant"),
  ),
);

for (const transaction of result.transactions) {
  assert.equal("team_api_id" in transaction.metadata, false);
  assert.equal("tournament_api_id" in transaction.metadata, false);
  assert.equal("season_api_id" in transaction.metadata, false);
}

assert.throws(
  () => buildTeamAssociationRuleTransactions(sampleRows, ["unknown_stat"]),
  /Unknown statistic key: unknown_stat\./,
);

console.log("Association rules discretization verification passed.");
