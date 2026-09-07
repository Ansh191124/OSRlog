import { Router } from "express";
import {
  listInventoryPurchases,
  createInventoryPurchase,
  payInventoryPurchase,
  rejectInventoryPurchase,
} from "../controllers/inventoryPurchaseController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const router = Router();
const viewers = requireScope(
  ROLES.ADMIN,
  ROLES.CO_ADMIN,
  EMPLOYEE_CATEGORIES.ENTRY_MASTER,
  EMPLOYEE_CATEGORIES.ACCOUNTANT
);
const creators = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN, EMPLOYEE_CATEGORIES.ENTRY_MASTER);
const accountantOnly = requireScope(EMPLOYEE_CATEGORIES.ACCOUNTANT);

router.use(requireAuth);
router.get("/", viewers, asyncHandler(listInventoryPurchases));
router.post("/", creators, asyncHandler(createInventoryPurchase));
router.patch("/:id/pay", accountantOnly, asyncHandler(payInventoryPurchase));
router.patch("/:id/reject", accountantOnly, asyncHandler(rejectInventoryPurchase));

export default router;
