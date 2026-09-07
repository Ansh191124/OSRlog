import { Router } from "express";
import { createPeopleController } from "../controllers/peopleController.js";
import { requireAuth, requireScope } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

// Builds a router for one people-resource (driver | client | employee), all
// managed by Entry Master, Admin and Co-Admin per the requirements doc.
export function createPeopleRoutes(role) {
  const router = Router();
  const canManage = requireScope(ROLES.ADMIN, ROLES.CO_ADMIN, EMPLOYEE_CATEGORIES.ENTRY_MASTER);
  const { list, create, update } = createPeopleController(role);

  router.use(requireAuth);
  router.get("/", canManage, asyncHandler(list));
  router.post("/", canManage, asyncHandler(create));
  router.patch("/:id", canManage, asyncHandler(update));

  return router;
}
