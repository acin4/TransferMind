import { Router } from "express";
import { asyncHandler } from "../lib/http.js";
import {
  getPlayerController,
  listPlayersController,
} from "../controllers/playerController.js";
import {
  listCurrentSeasonsController,
  getStandingsController,
} from "../controllers/standingsController.js";
import {
  getTeamController,
  getTeamStatsController,
  listTeamsController,
} from "../controllers/teamController.js";

const router = Router();

router.get("/teams", asyncHandler(listTeamsController));
router.get("/teams/:id", asyncHandler(getTeamController));
router.get("/teams/:id/stats", asyncHandler(getTeamStatsController));

router.get("/players", asyncHandler(listPlayersController));
router.get("/players/:id", asyncHandler(getPlayerController));

router.get(
  "/tournaments/current-seasons",
  asyncHandler(listCurrentSeasonsController),
);
router.get("/standings", asyncHandler(getStandingsController));

export default router;
