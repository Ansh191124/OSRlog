import { Router } from "express";
import multer from "multer";
import { uploadProof } from "../controllers/uploadController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();
router.use(requireAuth);
router.post("/proof", upload.single("file"), asyncHandler(uploadProof));

export default router;
