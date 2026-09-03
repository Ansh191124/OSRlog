const express = require("express");
const router = express.Router();
const {
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  addTripEntry,
  updateTripEntry,
  deleteTripEntry,
  upsertTripExpense,
  upsertTripSummary,
  calculateTripSummary,
  addDriverChange,
  exportTrip,
  uploadLrPhoto,
} = require("../controllers/tripController");
const { protect, authorize, requirePermission, requireAnyPermission } = require("../middlewares/auth");
const { upload, setUploadFolder } = require("../middlewares/upload");

router.use(protect);

// Staff (trips) and clients creating/viewing their own LR's (fleets) both need these.
const staffOrClient = requireAnyPermission("trips", "fleets");
router.get("/", staffOrClient, getTrips);
router.get("/:id", staffOrClient, getTrip);
router.post("/", staffOrClient, createTrip);
router.post("/:id/lr-photo", staffOrClient, setUploadFolder("trips"), upload.single("file"), uploadLrPhoto);

// Everything below is the actual trip sheet - staff only, clients never touch it.
router.get("/:id/export", requirePermission("trips"), exportTrip);
router.put("/:id", requirePermission("trips"), updateTrip);
router.delete("/:id", requirePermission("trips"), authorize("admin"), deleteTrip);

router.post("/:id/entries", requirePermission("trips"), addTripEntry);
router.put("/:id/entries/:entryId", requirePermission("trips"), updateTripEntry);
router.delete("/:id/entries/:entryId", requirePermission("trips"), deleteTripEntry);

router.put("/:id/expense", requirePermission("trips"), upsertTripExpense);
router.put("/:id/summary", requirePermission("trips"), upsertTripSummary);

router.post("/:id/calculate", requirePermission("trips"), calculateTripSummary);
router.post("/:id/driver-changes", requirePermission("trips"), addDriverChange);

module.exports = router;
