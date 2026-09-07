import { Router } from "express";
import { listAuditLogs } from "../controllers/auditController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES } from "../config/roles.js";

const router = Router();
router.use(requireAuth, requireScope(ROLES.ADMIN));
router.get("/", asyncHandler(listAuditLogs));

export default router;
