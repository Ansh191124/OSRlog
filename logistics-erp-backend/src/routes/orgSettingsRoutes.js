const express = require("express");
const { getDieselRate, updateDieselRate } = require("../controllers/orgSettingsController");
const { protect, authorize } = require("../middlewares/auth");
const router = express.Router();

router.use(protect);

// Diesel rate is used by trip-sheet staff, not just fleet managers - only gated by login.
router.get("/diesel-rate", getDieselRate);
router.put("/diesel-rate", authorize("admin"), updateDieselRate);

module.exports = router;
