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
} = require("../controllers/tripController");
const { protect, authorize } = require("../middlewares/auth");

router.use(protect); // employees AND admins can create/manage trips

router.get("/", getTrips);
router.get("/:id", getTrip);
router.post("/", createTrip);
router.put("/:id", updateTrip);
router.delete("/:id", authorize("admin"), deleteTrip);

router.post("/:id/entries", addTripEntry);
router.put("/:id/entries/:entryId", updateTripEntry);
router.delete("/:id/entries/:entryId", deleteTripEntry);

router.put("/:id/expense", upsertTripExpense);
router.put("/:id/summary", upsertTripSummary);

router.post("/:id/calculate", calculateTripSummary);

module.exports = router;
