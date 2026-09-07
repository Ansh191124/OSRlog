import { Router } from "express";
import { createPeopleController } from "../controllers/peopleController.js";
import { listDriverSummaries } from "../controllers/driverSummaryController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const router = Router();
const canManage = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN, EMPLOYEE_CATEGORIES.ENTRY_MASTER);
// Vehicle Master can view full driver detail (read-only) but not create/edit them.
const canView = requireScope(
  ROLES.ADMIN,
  ROLES.CO_ADMIN,
  EMPLOYEE_CATEGORIES.ENTRY_MASTER,
  EMPLOYEE_CATEGORIES.VEHICLE_MASTER
);
const adminOrCoAdmin = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN);
const { list, create, update } = createPeopleController(ROLES.DRIVER);

router.use(requireAuth);
router.get("/summary", adminOrCoAdmin, asyncHandler(listDriverSummaries));
router.get("/", canView, asyncHandler(list));
router.post("/", canManage, asyncHandler(create));
router.patch("/:id", canManage, asyncHandler(update));

export default router;
