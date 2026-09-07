import { Router } from "express";
import { listEmployees, updateAccess } from "../controllers/accessController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES } from "../config/roles.js";

const router = Router();
const adminOrCoAdmin = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN);

router.use(requireAuth, adminOrCoAdmin);
router.get("/employees", asyncHandler(listEmployees));
router.patch("/employees/:id", asyncHandler(updateAccess));

export default router;
