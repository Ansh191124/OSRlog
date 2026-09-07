import { Router } from "express";
import {
  listGoodsReceipts,
  previewEligibleLrs,
  generateForClient,
  downloadGoodsReceiptPdf,
} from "../controllers/goodsReceiptController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES } from "../config/roles.js";

const router = Router();
// Doc lists GR on Admin's page; Co-Admin included per "Full Access" (same
// precedent as Vehicle Assign / Roles & Access elsewhere in this app).
const adminOrCoAdmin = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN);

router.use(requireAuth, adminOrCoAdmin);
router.get("/", asyncHandler(listGoodsReceipts));
router.get("/eligible/:clientId", asyncHandler(previewEligibleLrs));
router.post("/", asyncHandler(generateForClient));
router.get("/:id/pdf", asyncHandler(downloadGoodsReceiptPdf));

export default router;
