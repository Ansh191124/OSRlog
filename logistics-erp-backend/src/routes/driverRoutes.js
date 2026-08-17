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
const { protect, authorize } = require("../middlewares/auth");
const { upload, setUploadFolder } = require("../middlewares/upload");

router.use(protect); // all driver routes require login

router.get("/", getDrivers);
router.get("/:id", getDriver);
router.post("/", createDriver);
router.put("/:id", updateDriver);
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
