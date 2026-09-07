import { Router } from "express";
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  bulkAssignVehicles,
  vehicleAssignOverview,
  driverUpdateVehicleStatus,
} from "../controllers/vehicleController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const router = Router();
const canManage = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN, EMPLOYEE_CATEGORIES.ENTRY_MASTER);
const canViewOnly = requireScope(
  ROLES.ADMIN,
  ROLES.CO_ADMIN,
  EMPLOYEE_CATEGORIES.ENTRY_MASTER,
  EMPLOYEE_CATEGORIES.VEHICLE_MASTER,
  ROLES.DRIVER
);
// Deliberately excludes DRIVER — general vehicle edits go through the
// driver-status endpoint below, which only allows a narrow status change.
const canUpdate = requireScope(
  ROLES.ADMIN,
  ROLES.CO_ADMIN,
  EMPLOYEE_CATEGORIES.ENTRY_MASTER,
  EMPLOYEE_CATEGORIES.VEHICLE_MASTER
);
const adminOrCoAdmin = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN);
const driverOnly = requireScope(ROLES.DRIVER);

router.use(requireAuth);
router.get("/assign-overview", adminOrCoAdmin, asyncHandler(vehicleAssignOverview));
router.post("/bulk-assign", adminOrCoAdmin, asyncHandler(bulkAssignVehicles));
router.get("/", canViewOnly, asyncHandler(listVehicles));
router.post("/", canManage, asyncHandler(createVehicle));
router.patch("/:id", canUpdate, asyncHandler(updateVehicle));
router.patch("/:id/driver-status", driverOnly, asyncHandler(driverUpdateVehicleStatus));

export default router;
