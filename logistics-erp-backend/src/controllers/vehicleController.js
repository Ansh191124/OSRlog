import Vehicle from "../models/Vehicle.js";
import User from "../models/User.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

export async function listVehicles(req, res) {
  const filter = {};
  // Vehicle Master only sees vehicles assigned to them ("mine" scope).
  if (req.scope === EMPLOYEE_CATEGORIES.VEHICLE_MASTER) {
    filter.assignedVehicleMaster = req.user._id;
  } else if (req.scope === ROLES.DRIVER) {
    filter.currentDriver = req.user._id;
  }

  const vehicles = await Vehicle.find(filter)
    .populate("assignedVehicleMaster", "name email")
    .populate("currentDriver", "name email")
    .sort({ createdAt: -1 });
  res.json({ vehicles });
}

export async function createVehicle(req, res) {
  const {
    registrationNumber,
    type,
    capacity,
    baseLocation,
    rcNumber,
    rcPhotoKey,
    ownershipType,
    ownerName,
    odometerReading,
    tyreCount,
    vehicleDimension,
  } = req.body;
  if (!registrationNumber) {
    return res.status(400).json({ message: "registrationNumber is required" });
  }

  const isThirdParty = ownershipType === "third_party";
  const vehicle = await Vehicle.create({
    registrationNumber: registrationNumber.trim().toUpperCase(),
    type,
    capacity,
    baseLocation,
    rcNumber,
    rcPhotoKey,
    ownershipType: isThirdParty ? "third_party" : "company",
    // Per doc: if Third Party, owner details aren't collected.
    ownerName: isThirdParty ? undefined : ownerName,
    odometerReading: odometerReading || 0,
    tyreCount: tyreCount ?? null,
    vehicleDimension,
  });
  res.status(201).json({ vehicle });
}

export async function updateVehicle(req, res) {
  const { id } = req.params;
  const {
    registrationNumber,
    type,
    capacity,
    baseLocation,
    status,
    currentDriver,
    rcNumber,
    rcPhotoKey,
    ownershipType,
    ownerName,
    odometerReading,
    tyreCount,
    vehicleDimension,
  } = req.body;

  const vehicle = await Vehicle.findById(id);
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

  // Vehicle Master may only touch their own assigned vehicles.
  if (req.scope === EMPLOYEE_CATEGORIES.VEHICLE_MASTER) {
    if (!vehicle.assignedVehicleMaster || String(vehicle.assignedVehicleMaster) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not your assigned vehicle" });
    }
  }

  if (registrationNumber) vehicle.registrationNumber = registrationNumber.trim().toUpperCase();
  if (type !== undefined) vehicle.type = type;
  if (capacity !== undefined) vehicle.capacity = capacity;
  if (baseLocation !== undefined) vehicle.baseLocation = baseLocation;
  if (status) vehicle.status = status;
  if (currentDriver !== undefined) vehicle.currentDriver = currentDriver || null;
  if (rcNumber !== undefined) vehicle.rcNumber = rcNumber;
  if (rcPhotoKey !== undefined) vehicle.rcPhotoKey = rcPhotoKey;
  if (ownershipType !== undefined) {
    vehicle.ownershipType = ownershipType === "third_party" ? "third_party" : "company";
    if (vehicle.ownershipType === "third_party") vehicle.ownerName = undefined;
  }
  if (ownerName !== undefined && vehicle.ownershipType !== "third_party") vehicle.ownerName = ownerName;
  if (odometerReading !== undefined) vehicle.odometerReading = odometerReading;
  if (tyreCount !== undefined) vehicle.tyreCount = tyreCount;
  if (vehicleDimension !== undefined) vehicle.vehicleDimension = vehicleDimension;

  await vehicle.save();
  res.json({ vehicle });
}

// Driver: "Update vehicle Status" — report their own vehicle as available or
// needing maintenance. Other statuses (on_trip/inactive) are system/admin controlled.
export async function driverUpdateVehicleStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!["available", "maintenance"].includes(status)) {
    return res.status(400).json({ message: "status must be 'available' or 'maintenance'" });
  }

  const vehicle = await Vehicle.findById(id);
  if (!vehicle || !vehicle.currentDriver || String(vehicle.currentDriver) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not your current vehicle" });
  }

  vehicle.status = status;
  await vehicle.save();
  res.json({ vehicle });
}

// Co-Admin/Admin: assign a batch of vehicles to one Vehicle Master in one call.
export async function bulkAssignVehicles(req, res) {
  const { vehicleIds, vehicleMasterId } = req.body;
  if (!Array.isArray(vehicleIds) || vehicleIds.length === 0 || !vehicleMasterId) {
    return res.status(400).json({ message: "vehicleIds (non-empty array) and vehicleMasterId are required" });
  }

  const vehicleMaster = await User.findOne({
    _id: vehicleMasterId,
    role: ROLES.EMPLOYEE,
    employeeCategory: EMPLOYEE_CATEGORIES.VEHICLE_MASTER,
  });
  if (!vehicleMaster) return res.status(404).json({ message: "Vehicle Master not found" });

  await Vehicle.updateMany({ _id: { $in: vehicleIds } }, { assignedVehicleMaster: vehicleMaster._id });
  const vehicles = await Vehicle.find({ _id: { $in: vehicleIds } });
  res.json({ vehicles });
}

// Co-Admin/Admin: per-Vehicle-Master vehicle counts and statuses.
export async function vehicleAssignOverview(req, res) {
  const vehicleMasters = await User.find({
    role: ROLES.EMPLOYEE,
    employeeCategory: EMPLOYEE_CATEGORIES.VEHICLE_MASTER,
  }).select("name email");

  const vehicles = await Vehicle.find().select("registrationNumber status assignedVehicleMaster");

  const byMaster = vehicleMasters.map((vm) => {
    const assigned = vehicles.filter((v) => String(v.assignedVehicleMaster) === String(vm._id));
    return {
      vehicleMaster: { _id: vm._id, name: vm.name, email: vm.email },
      vehicleCount: assigned.length,
      vehicles: assigned.map((v) => ({ _id: v._id, registrationNumber: v.registrationNumber, status: v.status })),
    };
  });

  const unassigned = vehicles.filter((v) => !v.assignedVehicleMaster);

  res.json({ byMaster, unassigned });
}
