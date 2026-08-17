const express = require("express");
const router = express.Router();
const {
  getMaintenances,
  getMaintenance,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
  getAlerts,
  uploadInvoice,
} = require("../controllers/maintenanceController");
const { protect, authorize } = require("../middlewares/auth");
const { upload, setUploadFolder } = require("../middlewares/upload");

router.use(protect);

router.get("/", getMaintenances);
router.get("/alerts", getAlerts);
router.get("/:id", getMaintenance);
router.post("/", createMaintenance);
router.put("/:id", updateMaintenance);
router.delete("/:id", authorize("admin"), deleteMaintenance);

router.post("/:id/invoice", setUploadFolder("maintenance"), upload.single("file"), uploadInvoice);

module.exports = router;
