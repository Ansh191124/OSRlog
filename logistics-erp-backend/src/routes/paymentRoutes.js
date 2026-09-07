import { Router } from "express";
import {
  createPaymentRequest,
  listPayments,
  vehicleMasterDecide,
  accountantPay,
} from "../controllers/paymentController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const router = Router();
const driverOnly = requireScope(ROLES.DRIVER);
const viewers = requireScope(
  ROLES.DRIVER,
  EMPLOYEE_CATEGORIES.VEHICLE_MASTER,
  EMPLOYEE_CATEGORIES.ACCOUNTANT,
  ROLES.ADMIN,
  ROLES.CO_ADMIN
);
const vehicleMasterOnly = requireScope(EMPLOYEE_CATEGORIES.VEHICLE_MASTER);
const accountantOnly = requireScope(EMPLOYEE_CATEGORIES.ACCOUNTANT);

router.use(requireAuth);
router.get("/", viewers, asyncHandler(listPayments));
router.post("/", driverOnly, asyncHandler(createPaymentRequest));
router.patch("/:id/vehicle-master-decide", vehicleMasterOnly, asyncHandler(vehicleMasterDecide));
router.patch("/:id/pay", accountantOnly, asyncHandler(accountantPay));

export default router;
