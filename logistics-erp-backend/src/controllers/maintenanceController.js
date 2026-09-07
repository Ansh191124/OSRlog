import VehicleMaintenance from "../models/VehicleMaintenance.js";
import Vehicle from "../models/Vehicle.js";
import { EMPLOYEE_CATEGORIES } from "../config/roles.js";

export async function listMaintenance(req, res) {
  const filter = {};
  if (req.scope === EMPLOYEE_CATEGORIES.VEHICLE_MASTER) {
    const myVehicleIds = await Vehicle.find({ assignedVehicleMaster: req.user._id }).distinct("_id");
    filter.vehicle = { $in: myVehicleIds };
  }

  const records = await VehicleMaintenance.find(filter)
    .populate("vehicle", "registrationNumber")
    .populate("recordedBy", "name")
    .sort({ date: -1 });
  res.json({ records });
}

export async function createMaintenance(req, res) {
  const { vehicleId, description, cost, date } = req.body;
  if (!vehicleId || !description) {
    return res.status(400).json({ message: "vehicleId and description are required" });
  }

  const vehicle = await Vehicle.findById(vehicleId);
  if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });

  if (req.scope === EMPLOYEE_CATEGORIES.VEHICLE_MASTER) {
    if (!vehicle.assignedVehicleMaster || String(vehicle.assignedVehicleMaster) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not your assigned vehicle" });
    }
  }

  const record = await VehicleMaintenance.create({
    vehicle: vehicle._id,
    recordedBy: req.user._id,
    description,
    cost: cost || 0,
    date: date || Date.now(),
  });
  res.status(201).json({ record });
}
