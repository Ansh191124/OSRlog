const asyncHandler = require("express-async-handler");
const { Driver } = require("../models");
const { getFileUrl } = require("../middlewares/upload");
const { getPagination, paginationMeta } = require("../utils/api");

// @route  GET /api/drivers
const getDrivers = asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const { page, limit, skip } = getPagination(req.query);
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { licenseNumber: { $regex: search, $options: "i" } },
    ];
  }

  const [rows, count] = await Promise.all([
    Driver.find(where)
      .populate("assignedVehicle", "vehicleNo")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Driver.countDocuments(where),
  ]);

  res.json({
    success: true,
    data: rows,
    pagination: paginationMeta(count, page, limit),
  });
});

// @route  GET /api/drivers/:id
const getDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.id).populate("assignedVehicle", "vehicleNo");
  if (!driver) {
    res.status(404);
    throw new Error("Driver not found");
  }
  res.json({ success: true, data: driver });
});

// @route  POST /api/drivers
const createDriver = asyncHandler(async (req, res) => {
  if (!req.body.name || !req.body.phone || !req.body.licenseNumber || !req.body.licenseExpiry) {
    res.status(400);
    throw new Error("name, phone, license number and license expiry are required");
  }
  const payload = { ...req.body, createdBy: req.user._id };
  const driver = await Driver.create(payload);
  res.status(201).json({ success: true, data: driver });
});

// @route  PUT /api/drivers/:id
const updateDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!driver) {
    res.status(404);
    throw new Error("Driver not found");
  }
  res.json({ success: true, data: driver });
});

// @route  DELETE /api/drivers/:id
const deleteDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.findByIdAndDelete(req.params.id);
  if (!driver) {
    res.status(404);
    throw new Error("Driver not found");
  }
  res.json({ success: true, message: "Driver deleted" });
});

// @route  POST /api/drivers/:id/photo  (multipart/form-data, field name "file")
const uploadDriverPhoto = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) {
    res.status(404);
    throw new Error("Driver not found");
  }
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }
  const url = getFileUrl(req, req.file);
  driver.photoUrl = url;
  await driver.save();
  res.json({ success: true, data: { photoUrl: url } });
});

// @route  POST /api/drivers/:id/license-doc
const uploadDriverLicenseDoc = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.id);
  if (!driver) {
    res.status(404);
    throw new Error("Driver not found");
  }
  if (!req.file) {
    res.status(400);
    throw new Error("No file uploaded");
  }
  const url = getFileUrl(req, req.file);
  driver.licenseDocUrl = url;
  await driver.save();
  res.json({ success: true, data: { licenseDocUrl: url } });
});

module.exports = {
  getDrivers,
  getDriver,
  createDriver,
  updateDriver,
  deleteDriver,
  uploadDriverPhoto,
  uploadDriverLicenseDoc,
};
