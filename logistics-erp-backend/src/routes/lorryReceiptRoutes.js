import { Router } from "express";
import {
  listLorryReceipts,
  getLorryReceipt,
  createLorryReceipt,
  decideLorryReceipt,
  downloadLorryReceiptPdf,
} from "../controllers/lorryReceiptController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const router = Router();
const adminOrCoAdmin = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN);
const creators = requireScope(ROLES.CLIENT, ROLES.ADMIN, ROLES.CO_ADMIN);
const viewers = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN, ROLES.CLIENT, EMPLOYEE_CATEGORIES.VEHICLE_MASTER);

router.use(requireAuth);
router.get("/", viewers, asyncHandler(listLorryReceipts));
router.post("/", creators, asyncHandler(createLorryReceipt));
router.get("/:id", viewers, asyncHandler(getLorryReceipt));
router.patch("/:id/decide", adminOrCoAdmin, asyncHandler(decideLorryReceipt));
router.get("/:id/pdf", viewers, asyncHandler(downloadLorryReceiptPdf));

export default router;
