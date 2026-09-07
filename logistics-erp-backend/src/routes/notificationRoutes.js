import { Router } from "express";
import { listNotifications, markRead, markAllRead } from "../controllers/notificationController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();
router.use(requireAuth);
router.get("/", asyncHandler(listNotifications));
router.patch("/:id/read", asyncHandler(markRead));
router.patch("/read-all", asyncHandler(markAllRead));

export default router;
