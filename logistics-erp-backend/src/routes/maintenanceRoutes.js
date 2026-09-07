import { Router } from "express";
import { listMaintenance, createMaintenance } from "../controllers/maintenanceController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const router = Router();
const canAccess = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN, EMPLOYEE_CATEGORIES.VEHICLE_MASTER);

router.use(requireAuth, canAccess);
router.get("/", asyncHandler(listMaintenance));
router.post("/", asyncHandler(createMaintenance));

export default router;
