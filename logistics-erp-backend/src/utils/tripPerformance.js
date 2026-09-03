const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const driverTripFilter = (driver) => {
  const clauses = [{ driver: driver._id }];
  if (driver.name?.trim()) {
    clauses.push({ driverNameText: new RegExp(`^${escapeRegex(driver.name.trim())}$`, "i") });
  }
  return { $or: clauses };
};

const vehicleTripFilter = (vehicle) => {
  const clauses = [{ vehicle: vehicle._id }];
  if (vehicle.vehicleNo?.trim()) {
    clauses.push({ vehicleNoText: new RegExp(`^${escapeRegex(vehicle.vehicleNo.trim())}$`, "i") });
  }
  return { $or: clauses };
};

// A driver's actual pay for a trip - salary paid out plus any advance given -
// never the trip's company-level profit/loss, which isn't the driver's money.
const driverEarningForTrip = (trip) => {
  const salary = trip.expense?.salary || 0;
  const advances = (trip.entries || []).reduce((sum, entry) => sum + (entry.adv || 0), 0);
  return salary + advances;
};

const summarizeTrips = (trips) => ({
  tripCount: trips.length,
  totalFreight: trips.reduce((sum, trip) => sum + (trip.summary?.freightTotal || 0), 0),
  totalExpenses: trips.reduce((sum, trip) => sum + (trip.summary?.expensesTotal || 0), 0),
  totalProfitLoss: trips.reduce((sum, trip) => sum + (trip.summary?.profitLoss || 0), 0),
});

const summarizeDriverTrips = (trips) => ({
  tripCount: trips.length,
  totalFreight: trips.reduce((sum, trip) => sum + (trip.summary?.freightTotal || 0), 0),
  totalEarning: trips.reduce((sum, trip) => sum + driverEarningForTrip(trip), 0),
});

const attachPerformanceToDrivers = (drivers, trips) => {
  const byId = new Map(drivers.map((driver) => [String(driver._id), summarizeDriverTrips([])]));
  const nameToId = new Map(
    drivers
      .filter((driver) => driver.name?.trim())
      .map((driver) => [driver.name.trim().toLowerCase(), String(driver._id)])
  );

  trips.forEach((trip) => {
    let key = trip.driver ? String(trip.driver) : null;
    if (!key && trip.driverNameText?.trim()) {
      key = nameToId.get(trip.driverNameText.trim().toLowerCase()) || null;
    }
    if (!key || !byId.has(key)) return;
    const summary = byId.get(key);
    summary.tripCount += 1;
    summary.totalFreight += trip.summary?.freightTotal || 0;
    summary.totalEarning += driverEarningForTrip(trip);
  });

  return drivers.map((driver) => ({
    ...driver,
    performance: byId.get(String(driver._id)) || summarizeDriverTrips([]),
  }));
};

const attachPerformanceToVehicles = (vehicles, trips) => {
  const byId = new Map(vehicles.map((vehicle) => [String(vehicle._id), summarizeTrips([])]));
  const noToId = new Map(
    vehicles
      .filter((vehicle) => vehicle.vehicleNo?.trim())
      .map((vehicle) => [vehicle.vehicleNo.trim().toUpperCase(), String(vehicle._id)])
  );

  trips.forEach((trip) => {
    let key = trip.vehicle ? String(trip.vehicle) : null;
    if (!key && trip.vehicleNoText?.trim()) {
      key = noToId.get(trip.vehicleNoText.trim().toUpperCase()) || null;
    }
    if (!key || !byId.has(key)) return;
    const summary = byId.get(key);
    summary.tripCount += 1;
    summary.totalFreight += trip.summary?.freightTotal || 0;
    summary.totalExpenses += trip.summary?.expensesTotal || 0;
    summary.totalProfitLoss += trip.summary?.profitLoss || 0;
  });

  return vehicles.map((vehicle) => ({
    ...vehicle,
    performance: byId.get(String(vehicle._id)) || summarizeTrips([]),
  }));
};

module.exports = {
  driverTripFilter,
  vehicleTripFilter,
  summarizeTrips,
  summarizeDriverTrips,
  attachPerformanceToDrivers,
  attachPerformanceToVehicles,
};
