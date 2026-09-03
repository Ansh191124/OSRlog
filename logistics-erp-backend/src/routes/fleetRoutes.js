const express = require("express");
const { getFleets, createFleet, updateFleet } = require("../controllers/fleetController");
const { protect, authorize, requirePermission } = require("../middlewares/auth");
const router = express.Router();
router.use(protect, requirePermission("fleets"));
router.get("/", getFleets);
router.post("/", createFleet);
router.put("/:id", authorize("admin", "co_admin"), updateFleet);
module.exports = router;
