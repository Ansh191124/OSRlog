import { Router } from "express";
import { listLedger, createLedgerEntry, updateLedgerEntry, accountantOverview } from "../controllers/ledgerController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const router = Router();
// Admin: Payment Logs (all entries). Accountant: Cashbook/Cashless book (own entries).
const viewers = requireScope(ROLES.ADMIN, EMPLOYEE_CATEGORIES.ACCOUNTANT);
const accountantOnly = requireScope(EMPLOYEE_CATEGORIES.ACCOUNTANT);

router.use(requireAuth);
router.get("/", viewers, asyncHandler(listLedger));
router.post("/", accountantOnly, asyncHandler(createLedgerEntry));
router.patch("/:id", accountantOnly, asyncHandler(updateLedgerEntry));
router.get("/overview", accountantOnly, asyncHandler(accountantOverview));

export default router;
