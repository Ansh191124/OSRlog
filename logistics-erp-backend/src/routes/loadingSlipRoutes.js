import { Router } from "express";
import {
  listLoadingSlips,
  getLoadingSlip,
  createLoadingSlip,
  submitPayment,
  verifyPayment,
  downloadLoadingSlipPdf,
} from "../controllers/loadingSlipController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const router = Router();
const viewers = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN, ROLES.CLIENT, EMPLOYEE_CATEGORIES.ACCOUNTANT);
const adminOrCoAdmin = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN);
const clientOnly = requireScope(ROLES.CLIENT);
const accountantOnly = requireScope(EMPLOYEE_CATEGORIES.ACCOUNTANT);
// Client submits for a normal slip; Admin/Co-Admin submits for a temporary/
// walk-in slip (no client) — the controller enforces which one applies.
const submitPaymentScope = requireScope(ROLES.CLIENT, ROLES.ADMIN, ROLES.CO_ADMIN);

router.use(requireAuth);
router.get("/", viewers, asyncHandler(listLoadingSlips));
router.post("/", adminOrCoAdmin, asyncHandler(createLoadingSlip));
router.get("/:id", viewers, asyncHandler(getLoadingSlip));
router.get("/:id/pdf", viewers, asyncHandler(downloadLoadingSlipPdf));
router.patch("/:id/submit-payment", submitPaymentScope, asyncHandler(submitPayment));
router.patch("/:id/verify", accountantOnly, asyncHandler(verifyPayment));

export default router;
