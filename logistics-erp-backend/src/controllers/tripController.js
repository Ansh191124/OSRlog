const asyncHandler = require("express-async-handler");
const { Trip, Driver, Fleet, Vehicle, ApprovalRequest } = require("../models");
const { suggestTripSummary } = require("../utils/calculations");
const { getPagination, paginationMeta, endOfDay } = require("../utils/api");
const { buildTripPdf, buildTripExcel } = require("../utils/tripExport");
const { getFileUrl } = require("../middlewares/upload");

// LR's that still count against a fleet's quota - a rejected LR frees the slot back up.
const ACTIVE_LR_STATUSES = ["requested", "approved"];

// Picks the next free vehicle for an approved LR - "nearest" here just means the
// first active vehicle not currently out on another ongoing trip (this app has no
// GPS/location tracking to do real proximity matching).
const findNextAvailableVehicle = async () => {
  const busyVehicleIds = await Trip.distinct("vehicle", { status: "ongoing", vehicle: { $ne: null } });
  return Vehicle.findOne({ status: "active", _id: { $nin: busyVehicleIds } }).sort({ createdAt: 1 });
};

const REQUIRED_ENTRY_FIELDS = ["date", "partyName", "fromLocation", "toLocation", "freight", "adv"];

const validateTripEntry = (body) => {
  for (const field of REQUIRED_ENTRY_FIELDS) {
    const value = body[field];
    if (value === undefined || value === null || value === "") {
      return `${field.replace(/([A-Z])/g, " $1").toLowerCase()} is required`;
    }
  }
  return null;
};

const populateTrip = (query) =>
  query
    .populate("vehicle", "vehicleNo vehicleType")
    .populate("driver", "name phone")
    .populate("driverChanges.driver", "name phone")
    .populate("driverChanges.recordedBy", "name");

// Auto-generate a human friendly trip code TRIP-000001
const generateTripCode = async () => {
  const count = await Trip.countDocuments();
  return `TRIP-${String(count + 1).padStart(6, "0")}`;
};

// @route GET /api/trips
// Supports filters: vehicleId, driverId, status, from, to (start date range), search
const getTrips = asyncHandler(async (req, res) => {
  const { vehicleId, driverId, status, fleetId, from, to, search } = req.query;
  const { page, limit, skip } = getPagination(req.query);
  const where = {};

  // A client only ever sees the LR's they themselves requested, never the whole trip book.
  if (req.user.role === "client") where.requestedBy = req.user._id;

  if (vehicleId) where.vehicle = vehicleId;
  if (driverId) where.driver = driverId;
  if (fleetId) where.fleet = fleetId;
  if (status) where.status = status;
  if (from || to) {
    where.startDate = {};
    if (from) where.startDate.$gte = new Date(from);
    if (to) where.startDate.$lte = endOfDay(to);
  }
  if (search) {
    where.$or = [
      { tripCode: { $regex: search, $options: "i" } },
      { vehicleNoText: { $regex: search, $options: "i" } },
      { driverNameText: { $regex: search, $options: "i" } },
    ];
  }

  const [rows, count] = await Promise.all([
    populateTrip(Trip.find(where))
      .sort({ startDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Trip.countDocuments(where),
  ]);

  res.json({
    success: true,
    data: rows,
    pagination: paginationMeta(count, page, limit),
  });
});

// @route GET /api/trips/:id
const getTrip = asyncHandler(async (req, res) => {
  const trip = await populateTrip(Trip.findById(req.params.id));
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  if (req.user.role === "client" && String(trip.requestedBy) !== String(req.user._id)) {
    res.status(403);
    throw new Error("This LR does not belong to you");
  }
  res.json({ success: true, data: trip });
});

// @route POST /api/trips
// Body: { ...trip fields, entries: [...], expense: {...}, summary: {...} }
// Every nested field is optional - staff fills only what they have, exactly like the paper sheet.
const createTrip = asyncHandler(async (req, res) => {
  if (req.user.role === "client") {
    const { fleetId, lrNumber, lrFromLocation, lrToLocation, lrGoodsDescription, startDate, remark } = req.body;
    if (!fleetId || !lrNumber?.trim() || !lrFromLocation?.trim() || !lrToLocation?.trim() || !lrGoodsDescription?.trim()) {
      res.status(400);
      throw new Error("An approved LR quota, LR number, from, to and goods details are required");
    }
    const fleet = await Fleet.findById(fleetId);
    if (!fleet || String(fleet.clientUser) !== String(req.user._id)) {
      res.status(404);
      throw new Error("LR quota not found");
    }
    if (fleet.reservationStatus !== "approved") {
      res.status(400);
      throw new Error("This LR quota is still awaiting admin approval");
    }
    const usedCount = await Trip.countDocuments({ fleet: fleet._id, requestStatus: { $in: ACTIVE_LR_STATUSES } });
    if (usedCount >= fleet.reservedVehicleCount) {
      res.status(409);
      throw new Error("You've used your full LR quota — request more from the admin");
    }

    const tripCode = await generateTripCode();
    const trip = await Trip.create({
      tripCode,
      fleet: fleet._id,
      lrNumber: lrNumber.trim(),
      lrFromLocation: lrFromLocation.trim(),
      lrToLocation: lrToLocation.trim(),
      lrGoodsDescription: lrGoodsDescription.trim(),
      requestStatus: "requested",
      requestedBy: req.user._id,
      startDate: startDate || undefined,
      remark,
      createdBy: req.user._id,
    });

    await ApprovalRequest.create({
      requestType: "lr_trip",
      title: `LR ${trip.lrNumber} — ${fleet.clientName}`,
      amount: 0,
      trip: trip._id,
      fleet: fleet._id,
      details: `${fleet.clientName} created LR ${trip.lrNumber} (${trip.lrFromLocation} → ${trip.lrToLocation}, ${trip.lrGoodsDescription}) against their approved quota (${usedCount + 1}/${fleet.reservedVehicleCount} used). Approving assigns the nearest available vehicle.`,
      requestedBy: req.user._id,
    });

    res.status(201).json({ success: true, data: trip });
    return;
  }

  const { entries = [], expense = {}, summary = {}, vehicleId, driverId, ...tripFields } = req.body;

  if (!(vehicleId || tripFields.vehicle || tripFields.vehicleNoText) || !(driverId || tripFields.driver || tripFields.driverNameText) || !tripFields.startDate) {
    res.status(400);
    throw new Error("vehicle, driver and start date are required");
  }

  const tripCode = tripFields.tripCode || (await generateTripCode());

  const trip = await Trip.create({
    ...tripFields,
    tripCode,
    vehicle: vehicleId || tripFields.vehicle || undefined,
    driver: driverId || tripFields.driver || undefined,
    entries,
    expense,
    summary,
    createdBy: req.user._id,
  });

  const populated = await populateTrip(Trip.findById(trip._id));
  res.status(201).json({ success: true, data: populated });
});

// @route PUT /api/trips/:id
// Accepts the same full-form payload as create. Dedicated nested endpoints remain useful
// for autosave workflows, but are no longer required by a frontend edit form.
const updateTrip = asyncHandler(async (req, res) => {
  const { entries, expense, summary, vehicleId, driverId, ...tripFields } = req.body;
  const update = {
    ...tripFields,
    ...(vehicleId !== undefined ? { vehicle: vehicleId || null } : {}),
    ...(driverId !== undefined ? { driver: driverId || null } : {}),
    ...(entries !== undefined ? { entries } : {}),
    ...(expense !== undefined ? { expense } : {}),
    ...(summary !== undefined ? { summary } : {}),
    updatedBy: req.user._id,
  };
  const trip = await Trip.findByIdAndUpdate(
    req.params.id,
    update,
    { new: true, runValidators: true }
  );
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  const populated = await populateTrip(Trip.findById(trip._id));
  res.json({ success: true, data: populated });
});

// @route DELETE /api/trips/:id
const deleteTrip = asyncHandler(async (req, res) => {
  const trip = await Trip.findByIdAndDelete(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  res.json({ success: true, message: "Trip deleted" });
});

// ---------------- Trip Entries (rows, embedded array) ----------------

const addTripEntry = asyncHandler(async (req, res) => {
  const entryError = validateTripEntry(req.body);
  if (entryError) {
    res.status(400);
    throw new Error(entryError);
  }
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  trip.entries.push(req.body);
  await trip.save();
  res.status(201).json({ success: true, data: trip.entries[trip.entries.length - 1] });
});

const updateTripEntry = asyncHandler(async (req, res) => {
  const entryError = validateTripEntry(req.body);
  if (entryError) {
    res.status(400);
    throw new Error(entryError);
  }
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  const entry = trip.entries.id(req.params.entryId);
  if (!entry) {
    res.status(404);
    throw new Error("Trip entry not found");
  }
  entry.set(req.body);
  await trip.save();
  res.json({ success: true, data: entry });
});

const deleteTripEntry = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  const entry = trip.entries.id(req.params.entryId);
  if (!entry) {
    res.status(404);
    throw new Error("Trip entry not found");
  }
  entry.deleteOne();
  await trip.save();
  res.json({ success: true, message: "Trip entry deleted" });
});

// ---------------- Trip Expense (embedded object, upsert) ----------------

const upsertTripExpense = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  trip.expense = { ...(trip.expense ? trip.expense.toObject() : {}), ...req.body };
  await trip.save();
  res.json({ success: true, data: trip.expense });
});

// ---------------- Trip Summary (embedded object, upsert) ----------------

const upsertTripSummary = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  trip.summary = { ...(trip.summary ? trip.summary.toObject() : {}), ...req.body };
  await trip.save();
  res.json({ success: true, data: trip.summary });
});

// @route POST /api/trips/:id/calculate
// Returns SUGGESTED summary values based on current entries/expense - does NOT save.
// Frontend can show these as pre-filled placeholders, but staff can override anything.
const calculateTripSummary = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  const suggestion = suggestTripSummary({
    trip,
    entries: trip.entries.map((e) => e.toObject()),
    expense: trip.expense ? trip.expense.toObject() : {},
  });
  res.json({ success: true, data: suggestion });
});

// @route GET /api/trips/:id/export?format=pdf|excel
const exportTrip = asyncHandler(async (req, res) => {
  const trip = await populateTrip(Trip.findById(req.params.id)).lean();
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  const format = req.query.format === "excel" ? "excel" : "pdf";
  const filename = `${trip.tripCode || "trip"}`;

  if (format === "excel") {
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
    await buildTripExcel(trip, res);
    return;
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
  buildTripPdf(trip, res);
});

// Records an immutable driver handover — does not overwrite the trip's original driver.
const addDriverChange = asyncHandler(async (req, res) => {
  const { driverId, effectiveAt, reason } = req.body;
  if (!driverId || !effectiveAt) {
    res.status(400);
    throw new Error("driver and effective time are required");
  }
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  const driver = await Driver.findById(driverId);
  if (!driver) {
    res.status(400);
    throw new Error("Driver not found");
  }
  trip.driverChanges.push({
    driver: driverId,
    driverNameText: driver.name,
    effectiveAt: new Date(effectiveAt),
    reason: reason || "",
    recordedBy: req.user._id,
  });
  await trip.save();
  const populated = await populateTrip(Trip.findById(trip._id));
  res.status(201).json({ success: true, data: populated });
});

// @route POST /api/trips/:id/lr-photo (multipart/form-data, field name "file")
const uploadLrPhoto = asyncHandler(async (req, res) => {
  const trip = await Trip.findById(req.params.id);
  if (!trip) {
    res.status(404);
    throw new Error("Trip not found");
  }
  if (req.user.role === "client" && String(trip.requestedBy) !== String(req.user._id)) {
    res.status(403);
    throw new Error("This LR does not belong to you");
  }
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }
  const url = getFileUrl(req, req.file);
  trip.lrPhotoUrl = url;
  await trip.save();
  res.json({ success: true, data: { lrPhotoUrl: url } });
});

module.exports = {
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
  findNextAvailableVehicle,
};
