const express = require("express");
const router = express.Router();
const {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getExpiringDocuments,
  uploadVehiclePhoto,
  uploadVehicleDoc,
} = require("../controllers/vehicleController");
const { protect, authorize } = require("../middlewares/auth");
const { upload, setUploadFolder } = require("../middlewares/upload");

router.use(protect);

router.get("/", getVehicles);
router.get("/expiring-documents", getExpiringDocuments);
router.get("/:id", getVehicle);
router.post("/", createVehicle);
router.put("/:id", updateVehicle);
router.delete("/:id", authorize("admin"), deleteVehicle);

router.post("/:id/photo", setUploadFolder("vehicles"), upload.single("file"), uploadVehiclePhoto);
router.post("/:id/document", setUploadFolder("vehicles"), upload.single("file"), uploadVehicleDoc);

module.exports = router;
