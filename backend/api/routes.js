import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import {
  getPlayerController,
  listPlayerTeamSquadsController,
  listPlayersController,
} from "../controllers/playerController.js";
import {
  listCurrentSeasonsController,
  getStandingsController,
  listTournamentSeasonsController,
} from "../controllers/standingsController.js";
import {
  calculateTeamClusterElbowController,
  createTeamsComparisonDatasetController,
  getTeamController,
  getTeamProfileController,
  getTeamsComparisonDatasetController,
  listTeamSeasonsController,
  listTeamPlayersController,
  getTeamStatsController,
  listTeamsController,
  runTeamAssociationRulesController,
  runTeamClustersController,
} from "../controllers/teamController.js";
import { searchController } from "../controllers/searchController.js";

const router = Router();

router.get("/search", asyncHandler(searchController));

router.get("/teams", asyncHandler(listTeamsController));
router.get(
  "/teams/comparison-dataset",
  asyncHandler(getTeamsComparisonDatasetController),
);
router.post(
  "/teams/comparison-dataset",
  asyncHandler(createTeamsComparisonDatasetController),
);
router.post(
  "/teams/clustering/elbow",
  asyncHandler(calculateTeamClusterElbowController),
);
router.post(
  "/teams/clustering/run",
  asyncHandler(runTeamClustersController),
);
router.post(
  "/team-season-stats/association-rules",
  asyncHandler(runTeamAssociationRulesController),
);
router.get("/teams/:id/profile", asyncHandler(getTeamProfileController));
router.get("/teams/:id/players", asyncHandler(listTeamPlayersController));
router.get("/teams/:id/seasons", asyncHandler(listTeamSeasonsController));
router.get("/teams/:id/stats", asyncHandler(getTeamStatsController));
router.get("/teams/:id", asyncHandler(getTeamController));

router.get("/players", asyncHandler(listPlayersController));
router.get("/players/team-squads", asyncHandler(listPlayerTeamSquadsController));
router.get("/players/:id", asyncHandler(getPlayerController));

router.get(
  "/tournaments/current-seasons",
  asyncHandler(listCurrentSeasonsController),
);
router.get(
  "/tournaments/:tournamentId/seasons",
  asyncHandler(listTournamentSeasonsController),
);
router.get("/standings", asyncHandler(getStandingsController));

export default router;
