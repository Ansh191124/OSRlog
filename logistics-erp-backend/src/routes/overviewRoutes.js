import { Router } from "express";
import { adminOverview, coAdminOverview } from "../controllers/overviewController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES } from "../config/roles.js";

const router = Router();
router.use(requireAuth);
router.get("/admin", requireScope(ROLES.ADMIN), asyncHandler(adminOverview));
router.get("/co-admin", requireScope(ROLES.CO_ADMIN), asyncHandler(coAdminOverview));

export default router;
