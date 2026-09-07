import { Router } from "express";
import {
  listReservations,
  createReservation,
  decideReservation,
  clientLrSummaryRoute,
} from "../controllers/reservationController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES } from "../config/roles.js";

const router = Router();
const clientOnly = requireScope(ROLES.CLIENT);
const adminOrCoAdmin = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN);
const viewers = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN, ROLES.CLIENT);

router.use(requireAuth);
router.get("/", viewers, asyncHandler(listReservations));
router.post("/", clientOnly, asyncHandler(createReservation));
router.patch("/:id/decide", adminOrCoAdmin, asyncHandler(decideReservation));
router.get("/my-summary", clientOnly, asyncHandler(clientLrSummaryRoute));

export default router;
