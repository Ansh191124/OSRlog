const express = require("express");
const router = express.Router();
const {
  getSummary,
  getTrend,
  getOverview,
  getVehiclePerformance,
} = require("../controllers/dashboardController");
const { protect, requirePermission } = require("../middlewares/auth");

router.use(protect, requirePermission("dashboard"));

router.get("/summary", getSummary);
router.get("/trend", getTrend);
router.get("/overview", getOverview);
router.get("/vehicle-performance", getVehiclePerformance);

module.exports = router;
