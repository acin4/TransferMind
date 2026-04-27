import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import {
  getPlayerController,
  listPlayersController,
} from "../controllers/playerController.js";
import {
  listCurrentSeasonsController,
  getStandingsController,
  listTournamentSeasonsController,
} from "../controllers/standingsController.js";
import {
  createTeamsComparisonDatasetController,
  getTeamController,
  getTeamProfileController,
  getTeamsComparisonDatasetController,
  listTeamSeasonsController,
  getTeamStatsController,
  listTeamsController,
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
router.get("/teams/:id/profile", asyncHandler(getTeamProfileController));
router.get("/teams/:id", asyncHandler(getTeamController));
router.get("/teams/:id/seasons", asyncHandler(listTeamSeasonsController));
router.get("/teams/:id/stats", asyncHandler(getTeamStatsController));

router.get("/players", asyncHandler(listPlayersController));
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
