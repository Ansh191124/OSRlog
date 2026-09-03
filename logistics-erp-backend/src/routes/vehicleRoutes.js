const express = require("express");
const router = express.Router();
const {
  getVehicles,
  getVehicle,
  getVehiclePerformance,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getExpiringDocuments,
  uploadVehiclePhoto,
  uploadVehicleDoc,
} = require("../controllers/vehicleController");
const { protect, authorize, requirePermission } = require("../middlewares/auth");
const { upload, setUploadFolder } = require("../middlewares/upload");

router.use(protect, requirePermission("vehicles"));

router.get("/", getVehicles);
router.get("/expiring-documents", getExpiringDocuments);
router.get("/:id/performance", getVehiclePerformance);
router.get("/:id", getVehicle);
router.post("/", authorize("admin", "co_admin"), createVehicle);
router.put("/:id", authorize("admin", "co_admin", "employee"), updateVehicle);
router.delete("/:id", authorize("admin"), deleteVehicle);

router.post("/:id/photo", setUploadFolder("vehicles"), upload.single("file"), uploadVehiclePhoto);
router.post("/:id/document", setUploadFolder("vehicles"), upload.single("file"), uploadVehicleDoc);

module.exports = router;
