const express = require("express");
const router = express.Router();
const {
  getDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  uploadDriverPhoto,
  uploadDriverLicenseDoc,
} = require("../controllers/driverController");
const { protect, authorize, requirePermission } = require("../middlewares/auth");
const { upload, setUploadFolder } = require("../middlewares/upload");

router.use(protect, requirePermission("drivers"));

router.get("/", getDrivers);
router.get("/:id", getDriver);
router.post("/", authorize("admin"), createDriver);
router.put("/:id", authorize("admin"), updateDriver);
router.delete("/:id", authorize("admin"), deleteDriver);

router.post(
  "/:id/photo",
  setUploadFolder("drivers"),
  upload.single("file"),
  uploadDriverPhoto
);
router.post(
  "/:id/license-doc",
  setUploadFolder("drivers"),
  upload.single("file"),
  uploadDriverLicenseDoc
);

module.exports = router;
