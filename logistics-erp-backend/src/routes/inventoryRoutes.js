import { Router } from "express";
import { listInventory, createInventoryItem, updateInventoryItem, recordUsage } from "../controllers/inventoryController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const router = Router();
// Admin/Co-Admin can manually add/edit stock directly; Entry Master's only
// path to add stock is the paid procurement flow (see inventoryPurchaseRoutes).
const adminOrCoAdmin = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN);
// All three can view stock and record usage against it.
const canViewAndUse = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN, EMPLOYEE_CATEGORIES.ENTRY_MASTER);

router.use(requireAuth);
router.get("/", canViewAndUse, asyncHandler(listInventory));
router.post("/", adminOrCoAdmin, asyncHandler(createInventoryItem));
router.patch("/:id", adminOrCoAdmin, asyncHandler(updateInventoryItem));
router.patch("/:id/usage", canViewAndUse, asyncHandler(recordUsage));

export default router;
