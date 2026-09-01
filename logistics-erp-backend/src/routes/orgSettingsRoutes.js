const express = require("express");
const { getSettings, updateSettings } = require("../controllers/orgSettingsController");
const { protect, authorize, requirePermission } = require("../middlewares/auth");
const router = express.Router();

router.use(protect, requirePermission("fleets"));
router.get("/fleet-pool", getSettings);
router.put("/fleet-pool", authorize("admin"), updateSettings);

module.exports = router;
