import { Router } from "express";
import {
  listTrips,
  getTrip,
  assignVehicleToLorryReceipt,
  addLegToTrip,
  markLegDelivered,
  updateTrip,
  closeTrip,
  submitClosingPayment,
  verifyClosingPayment,
  downloadTripSheetPdf,
  deleteTrip,
} from "../controllers/tripController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const router = Router();
const canView = requireScope(
  ROLES.ADMIN,
  ROLES.CO_ADMIN,
  EMPLOYEE_CATEGORIES.VEHICLE_MASTER,
  EMPLOYEE_CATEGORIES.ACCOUNTANT,
  ROLES.DRIVER
);
const canManage = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN, EMPLOYEE_CATEGORIES.VEHICLE_MASTER);
const vehicleMasterOnly = requireScope(EMPLOYEE_CATEGORIES.VEHICLE_MASTER);
const adminOrCoAdmin = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN);
const accountantOnly = requireScope(EMPLOYEE_CATEGORIES.ACCOUNTANT);

router.use(requireAuth);
router.get("/", canView, asyncHandler(listTrips));
router.post("/assign", vehicleMasterOnly, asyncHandler(assignVehicleToLorryReceipt));
router.get("/:id", canView, asyncHandler(getTrip));
router.get("/:id/pdf", canView, asyncHandler(downloadTripSheetPdf));
router.post("/:id/legs", vehicleMasterOnly, asyncHandler(addLegToTrip));
router.post("/:id/legs/:legId/deliver", vehicleMasterOnly, asyncHandler(markLegDelivered));
router.patch("/:id", canManage, asyncHandler(updateTrip));
router.post("/:id/close", vehicleMasterOnly, asyncHandler(closeTrip));
router.patch("/:id/submit-closing-payment", vehicleMasterOnly, asyncHandler(submitClosingPayment));
router.patch("/:id/verify-closing-payment", accountantOnly, asyncHandler(verifyClosingPayment));
router.delete("/:id", adminOrCoAdmin, asyncHandler(deleteTrip));

export default router;
