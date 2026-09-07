// Seeding file for testing/demo only, per the requirements doc. Wipes every
// business collection and rebuilds ~one month of realistic, internally
// consistent demo data — 10 clients, 30 vehicles, 40 drivers, 3 Vehicle
// Masters, 2 Accountants, 50+ trips, plus loading slips, reservations,
// maintenance, inventory, ledger and audit history — so the app has
// something worth clicking through immediately after `npm run seed`.
import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Vehicle from "./models/Vehicle.js";
import LRReservation from "./models/LRReservation.js";
import LorryReceipt from "./models/LorryReceipt.js";
import LoadingSlip from "./models/LoadingSlip.js";
import GoodsReceipt from "./models/GoodsReceipt.js";
import Trip, { TRIP_EXPENSE_CATEGORIES } from "./models/Trip.js";
import Payment from "./models/Payment.js";
import LedgerEntry from "./models/LedgerEntry.js";
import InventoryItem from "./models/InventoryItem.js";
import InventoryPurchase from "./models/InventoryPurchase.js";
import VehicleMaintenance from "./models/VehicleMaintenance.js";
import AuditLog from "./models/AuditLog.js";
import Notification from "./models/Notification.js";
import Counter from "./models/Counter.js";
import { createUserWithPassword } from "./controllers/authController.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "./config/roles.js";

const DEFAULT_PASSWORD = "Password123!";
const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.now();

function daysAgo(n) {
  return new Date(NOW - n * DAY_MS - Math.floor(Math.random() * DAY_MS));
}
// Steps a base date forward by some offset, but never past "now" — later
// pipeline stages are computed relative to earlier ones (e.g. verified =
// submitted + a few hours), and without this a base date already close to
// today could get pushed into the future.
function forward(base, offsetMs) {
  return new Date(Math.min(base.getTime() + offsetMs, NOW));
}
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function pickN(arr, n) {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(randInt(0, copy.length - 1), 1)[0]);
  }
  return out;
}
function chance(pct) {
  return Math.random() * 100 < pct;
}
function round2(n) {
  return Number(n.toFixed(2));
}

const CITIES = [
  "Pune", "Mumbai", "Nashik", "Nagpur", "Kolhapur", "Satara", "Aurangabad",
  "Solapur", "Indore", "Surat", "Ahmedabad", "Delhi", "Jaipur", "Lucknow", "Bengaluru",
];
const GOODS = [
  "Steel Coils", "Cement Bags", "Cotton Bales", "Textile Rolls", "Auto Parts",
  "Electronics", "FMCG Cartons", "Paper Reels", "Rice Bags", "Onion Crates",
  "Furniture", "Ceramic Tiles", "Plywood Sheets", "Packaged Foods", "Machinery Parts",
];
const COMPANY_SUFFIXES = [
  "Traders", "Logistics Pvt Ltd", "Industries", "Enterprises", "Textiles",
  "Agro Foods", "Exports", "Distributors", "Warehousing Co", "Freight Solutions",
];
const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Krishna", "Ishaan", "Rohan",
  "Ananya", "Diya", "Isha", "Kavya", "Meera", "Priya", "Riya", "Sneha", "Tanvi", "Neha",
  "Rajesh", "Suresh", "Mahesh", "Ramesh", "Vikram", "Manoj", "Sanjay", "Deepak", "Anil", "Sunil",
  "Pooja", "Kajal", "Anita", "Sunita", "Geeta", "Rekha", "Seema", "Shalini", "Vandana", "Nisha",
];
const LAST_NAMES = [
  "Sharma", "Verma", "Patel", "Gupta", "Kumar", "Singh", "Yadav", "Mehta", "Joshi", "Rao",
  "Reddy", "Nair", "Iyer", "Desai", "Kulkarni", "Pawar", "Shinde", "Chavan", "Bhosale", "Jadhav",
];

function fullName(usedNames) {
  let name;
  do {
    name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}

function emailFor(name, idx, domain) {
  return `${name.toLowerCase().replace(/\s+/g, ".")}${idx}@${domain}`;
}

async function seed() {
  await connectDB();
  if (mongoose.connection.readyState !== 1) {
    console.error("[seed] No database connection — set a real MONGODB_URI in backend/.env first.");
    process.exit(1);
  }

  console.log("[seed] Wiping existing business data...");
  await Promise.all([
    User.deleteMany({}),
    Vehicle.deleteMany({}),
    LRReservation.deleteMany({}),
    LorryReceipt.deleteMany({}),
    LoadingSlip.deleteMany({}),
    GoodsReceipt.deleteMany({}),
    Trip.deleteMany({}),
    Payment.deleteMany({}),
    LedgerEntry.deleteMany({}),
    InventoryItem.deleteMany({}),
    InventoryPurchase.deleteMany({}),
    VehicleMaintenance.deleteMany({}),
    AuditLog.deleteMany({}),
    Notification.deleteMany({}),
    Counter.deleteMany({}),
  ]);

  const usedNames = new Set();

  // ---------------------------------------------------------------------
  // Core staff
  // ---------------------------------------------------------------------
  console.log("[seed] Creating core staff...");
  const admin = await createUserWithPassword({ name: "Ansh Admin", email: "admin@osr.test", role: ROLES.ADMIN, phone: "9800000001" }, DEFAULT_PASSWORD);
  const coAdmin = await createUserWithPassword({ name: "Cara Co-Admin", email: "coadmin@osr.test", role: ROLES.CO_ADMIN, phone: "9800000002" }, DEFAULT_PASSWORD);
  const entryMaster = await createUserWithPassword(
    { name: "Ekta Entry-Master", email: "entrymaster@osr.test", role: ROLES.EMPLOYEE, employeeCategory: EMPLOYEE_CATEGORIES.ENTRY_MASTER, phone: "9800000003" },
    DEFAULT_PASSWORD
  );
  await createUserWithPassword(
    {
      name: "Priya Temp",
      email: "temp@osr.test",
      role: ROLES.EMPLOYEE,
      employeeCategory: EMPLOYEE_CATEGORIES.TEMPORARY,
      isTemporary: true,
      temporaryScope: ROLES.CO_ADMIN,
      phone: "9800000004",
    },
    DEFAULT_PASSWORD
  );

  const vehicleMasters = [];
  for (let i = 1; i <= 3; i++) {
    const name = fullName(usedNames);
    vehicleMasters.push(
      await createUserWithPassword(
        {
          name: `${name} (VM)`,
          email: `vehiclemaster${i}@osr.test`,
          role: ROLES.EMPLOYEE,
          employeeCategory: EMPLOYEE_CATEGORIES.VEHICLE_MASTER,
          phone: `98100000${10 + i}`,
        },
        DEFAULT_PASSWORD
      )
    );
  }

  const accountants = [];
  for (let i = 1; i <= 2; i++) {
    const name = fullName(usedNames);
    accountants.push(
      await createUserWithPassword(
        {
          name: `${name} (Accts)`,
          email: `accountant${i}@osr.test`,
          role: ROLES.EMPLOYEE,
          employeeCategory: EMPLOYEE_CATEGORIES.ACCOUNTANT,
          phone: `98200000${20 + i}`,
        },
        DEFAULT_PASSWORD
      )
    );
  }

  // ---------------------------------------------------------------------
  // Clients
  // ---------------------------------------------------------------------
  console.log("[seed] Creating 10 clients...");
  const clients = [];
  for (let i = 1; i <= 10; i++) {
    const name = fullName(usedNames);
    const company = `${pick(LAST_NAMES)} ${pick(COMPANY_SUFFIXES)}`;
    clients.push(
      await createUserWithPassword(
        {
          name,
          email: emailFor(name, i, "client.test"),
          role: ROLES.CLIENT,
          phone: `97${randInt(10000000, 99999999)}`,
          companyName: company,
          address: `${randInt(1, 200)}, ${pick(["MG Road", "Station Road", "Industrial Area", "Ring Road", "Market Yard"])}, ${pick(CITIES)}`,
          gstin: `27${randInt(10000, 99999)}${pick(["A", "B", "C"])}1Z${randInt(1, 9)}`,
          businessType: pick(["Manufacturing", "Trading", "Wholesale", "Retail Distribution", "Export/Import"]),
        },
        DEFAULT_PASSWORD
      )
    );
  }

  // ---------------------------------------------------------------------
  // Drivers
  // ---------------------------------------------------------------------
  console.log("[seed] Creating 40 drivers...");
  const drivers = [];
  for (let i = 1; i <= 40; i++) {
    const name = fullName(usedNames);
    drivers.push(
      await createUserWithPassword(
        {
          name,
          email: emailFor(name, i, "driver.test"),
          role: ROLES.DRIVER,
          phone: `96${randInt(10000000, 99999999)}`,
          licenseNumber: `MH${randInt(10, 50)}${randInt(2015, 2023)}${randInt(1000000, 9999999)}`,
          licenseType: pick(["LMV", "HMV", "LMV+HMV"]),
          licenseExpiry: new Date(NOW + randInt(-60, 900) * DAY_MS),
          dob: new Date(NOW - randInt(23, 55) * 365 * DAY_MS),
          employmentType: chance(80) ? "permanent" : "temporary",
          driverType: chance(75) ? "company" : "independent",
        },
        DEFAULT_PASSWORD
      )
    );
  }

  // ---------------------------------------------------------------------
  // Vehicles — 30, split across the 3 Vehicle Masters
  // ---------------------------------------------------------------------
  console.log("[seed] Creating 30 vehicles...");
  const vehicleTypes = ["Truck", "Container", "Trailer", "Mini Truck", "Tanker"];
  const capacities = ["6 Ton", "10 Ton", "16 Ton", "20 Ton", "25 Ton", "32 Ton"];
  const vehicles = [];
  for (let i = 1; i <= 30; i++) {
    const vm = vehicleMasters[i % 3];
    const driver = chance(70) ? drivers[randInt(0, drivers.length - 1)] : null;
    vehicles.push(
      await Vehicle.create({
        registrationNumber: `MH${String(randInt(1, 49)).padStart(2, "0")}${pick(["AB", "CD", "EF", "GH", "XY"])}${randInt(1000, 9999)}`,
        type: pick(vehicleTypes),
        capacity: pick(capacities),
        status: "available",
        assignedVehicleMaster: vm._id,
        currentDriver: driver?._id || null,
        baseLocation: pick(CITIES),
        rcNumber: `RC${randInt(100000, 999999)}`,
        ownershipType: chance(80) ? "company" : "third_party",
        ownerName: "OSR Logistics Pvt Ltd",
        odometerReading: randInt(5000, 180000),
        tyreCount: pick([6, 10, 12]),
        vehicleDimension: `${randInt(14, 34)}ft x 8ft x 8ft`,
        createdAt: daysAgo(randInt(35, 90)),
      })
    );
  }

  // ---------------------------------------------------------------------
  // Counters we'll advance ourselves as we go, then persist at the end.
  // ---------------------------------------------------------------------
  let lrSeq = 0;
  let billSeq = 0;
  let slipSeq = 0;
  let grSeq = 0;

  const auditLogs = [];
  const ledgerEntries = [];

  function audit(user, action, entityType, entityId, before, after, at) {
    auditLogs.push({ user: user._id, action, entityType, entityId, before, after, at });
  }

  // ---------------------------------------------------------------------
  // LR Reservations (approved, contiguous number blocks) + client LRs
  // ---------------------------------------------------------------------
  console.log("[seed] Creating reservations + client Lorry Receipts...");
  const allLorryReceipts = [];

  for (const client of clients) {
    const count = randInt(8, 13);
    const startNumber = lrSeq + 1;
    lrSeq += count;
    const endNumber = lrSeq;
    const decidedAt = daysAgo(randInt(28, 32));

    const reservation = await LRReservation.create({
      client: client._id,
      requestedCount: count,
      status: "approved",
      approvedCount: count,
      decidedBy: admin._id,
      decidedAt,
      startNumber,
      endNumber,
      nextNumber: endNumber + 1, // fully consumed below
      createdAt: daysAgo(randInt(29, 33)),
    });
    audit(admin, "reservation.decide", "LRReservation", reservation._id, { status: "pending" }, { status: "approved", approvedCount: count }, decidedAt);

    for (let n = startNumber; n <= endNumber; n++) {
      billSeq += 1;
      const consignorCity = pick(CITIES);
      let consigneeCity = pick(CITIES);
      while (consigneeCity === consignorCity) consigneeCity = pick(CITIES);

      const createdAt = daysAgo(randInt(1, 30));
      const lr = await LorryReceipt.create({
        lrNumber: n,
        billNumber: billSeq,
        client: client._id,
        requestedBy: client._id,
        isTemporary: false,
        status: "requested",
        fromLocation: consignorCity,
        toLocation: consigneeCity,
        goodsDescription: pick(GOODS),
        truckSizeFt: pick([14, 17, 19, 22, 24, 32, 34]),
        consignor: { name: client.companyName, address: `${consignorCity} Warehouse` },
        consignee: { name: `${pick(LAST_NAMES)} ${pick(COMPANY_SUFFIXES)}`, address: `${consigneeCity} Depot` },
        createdAt,
      });
      allLorryReceipts.push(lr);
    }
  }

  // A handful of temporary/walk-in LRs, numbered after every reserved block.
  console.log("[seed] Creating temporary/walk-in Lorry Receipts...");
  for (let i = 0; i < 8; i++) {
    lrSeq += 1;
    billSeq += 1;
    const fromCity = pick(CITIES);
    let toCity = pick(CITIES);
    while (toCity === fromCity) toCity = pick(CITIES);
    const creator = chance(50) ? admin : coAdmin;
    const createdAt = daysAgo(randInt(1, 25));
    const lr = await LorryReceipt.create({
      lrNumber: lrSeq,
      billNumber: billSeq,
      client: null,
      requestedBy: creator._id,
      isTemporary: true,
      status: "approved",
      approvedBy: creator._id,
      fromLocation: fromCity,
      toLocation: toCity,
      goodsDescription: pick(GOODS),
      truckSizeFt: pick([14, 17, 19, 22, 24]),
      consignor: { name: `Walk-in — ${pick(LAST_NAMES)}`, address: `${fromCity}` },
      consignee: { name: `${pick(LAST_NAMES)} ${pick(COMPANY_SUFFIXES)}`, address: `${toCity}` },
      createdAt,
    });
    allLorryReceipts.push(lr);
  }

  // ---------------------------------------------------------------------
  // Approve most LRs, create Loading Slips at varying pipeline stages
  // ---------------------------------------------------------------------
  console.log("[seed] Approving LRs and creating Loading Slips...");
  const verifiedLrs = []; // { lr, loadingSlip }

  for (const lr of allLorryReceipts) {
    if (lr.status === "approved") continue; // temporary LRs already approved

    const roll = Math.random() * 100;
    if (roll < 8) {
      continue; // stays "requested" — still awaiting Admin/Co-Admin decision
    }

    const decidedAt = forward(lr.createdAt, randInt(1, 6) * 60 * 60 * 1000);
    lr.status = "approved";
    lr.approvedBy = chance(50) ? admin._id : coAdmin._id;
    await lr.save();
    audit(admin, "lorryReceipt.decide", "LorryReceipt", lr._id, { status: "requested" }, { status: "approved" }, decidedAt);
  }

  for (const lr of allLorryReceipts) {
    if (lr.status !== "approved") continue;
    if (chance(12)) continue; // approved, but Co-Admin hasn't created a Loading Slip yet

    slipSeq += 1;
    const freightRate = randInt(6000, 45000);
    const otherCharges = chance(40) ? randInt(200, 2000) : 0;
    const totalAmount = freightRate + otherCharges;
    const fullAdvance = chance(40);
    const advance = fullAdvance ? totalAmount : Math.round(totalAmount * (randInt(40, 85) / 100));
    const creator = lr.isTemporary ? (chance(50) ? admin : coAdmin) : chance(50) ? admin : coAdmin;
    const createdAt = forward(lr.createdAt, randInt(6, 24) * 60 * 60 * 1000);

    const slip = await LoadingSlip.create({
      slipNumber: slipSeq,
      lorryReceipt: lr._id,
      client: lr.client,
      isTemporary: lr.isTemporary,
      createdBy: creator._id,
      freightRate,
      otherCharges,
      advance,
      paymentMode: chance(70) ? "consignor_pays" : "consignee_pays",
      paymentMethod: pick(["cash", "online", "upi", "bank_transfer", "cheque"]),
      status: "awaiting_payment",
      logs: [{ status: "awaiting_payment", note: "Loading Slip created", updatedBy: creator._id, at: createdAt }],
      createdAt,
    });
    audit(creator, "loadingSlip.create", "LoadingSlip", slip._id, null, { freightRate, advance }, createdAt);

    const stageRoll = Math.random() * 100;
    if (stageRoll < 10) {
      continue; // stays awaiting_payment
    }

    const submittedAt = forward(createdAt, randInt(2, 48) * 60 * 60 * 1000);
    const submitter = lr.isTemporary ? creator : await User.findById(lr.client);
    slip.status = "payment_submitted";
    slip.clientSubmittedAt = submittedAt;
    slip.paymentProofUrl =
      slip.paymentMethod === "cash"
        ? null
        : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    slip.logs.push({ status: "payment_submitted", note: "Payment submitted", updatedBy: submitter._id, at: submittedAt });
    await slip.save();

    if (stageRoll < 18) {
      continue; // stays payment_submitted, awaiting Accountant
    }

    const accountant = pick(accountants);
    const decidedAt = forward(submittedAt, randInt(2, 30) * 60 * 60 * 1000);

    if (stageRoll < 24) {
      slip.status = "payment_rejected";
      slip.rejectionReason = pick(["Proof unclear", "Amount mismatch", "Duplicate submission"]);
      slip.logs.push({ status: "payment_rejected", note: slip.rejectionReason, updatedBy: accountant._id, at: decidedAt });
      await slip.save();
      audit(accountant, "loadingSlip.verify", "LoadingSlip", slip._id, { status: "payment_submitted" }, { status: "payment_rejected" }, decidedAt);
      continue;
    }

    slip.status = "verified";
    slip.verifiedBy = accountant._id;
    slip.verifiedAt = decidedAt;
    slip.logs.push({ status: "verified", note: "Payment verified by Accountant", updatedBy: accountant._id, at: decidedAt });
    await slip.save();
    audit(accountant, "loadingSlip.verify", "LoadingSlip", slip._id, { status: "payment_submitted" }, { status: "verified" }, decidedAt);

    lr.loadingSlip = slip._id;
    await lr.save();

    const party = lr.isTemporary
      ? `Walk-in — ${lr.consignor.name}`
      : clients.find((c) => String(c._id) === String(lr.client))?.companyName || "Client";
    ledgerEntries.push({
      mode: slip.paymentMethod === "cash" ? "cash" : "online",
      direction: "received",
      amount: slip.advance,
      party,
      description: `Loading Slip #${slip.slipNumber} payment`,
      relatedLoadingSlip: slip._id,
      recordedBy: accountant._id,
      proofUrl: slip.paymentProofUrl,
      date: decidedAt,
      createdAt: decidedAt,
    });

    verifiedLrs.push({ lr, loadingSlip: slip });
  }

  // Hold a few verified LRs back — they'll get a trip that's assigned but
  // not yet delivered, for pipeline variety (see below).
  const heldBackForPendingDelivery = verifiedLrs.splice(0, Math.min(3, verifiedLrs.length));

  // ---------------------------------------------------------------------
  // Trips — assign a vehicle to each verified LR, deliver the leg, and
  // settle (or leave pending) any outstanding balance at closure.
  // ---------------------------------------------------------------------
  console.log(`[seed] Creating trips for ${verifiedLrs.length} verified Lorry Receipts...`);
  let tripCount = 0;
  for (const { lr, loadingSlip: slip } of verifiedLrs) {
    const vm = pick(vehicleMasters);
    const vehicle = pick(vehicles.filter((v) => String(v.assignedVehicleMaster) === String(vm._id))) || pick(vehicles);
    const driver = pick(drivers);
    const assignedAt = forward(slip.verifiedAt, randInt(2, 20) * 60 * 60 * 1000);
    const freight = slip.freightRate;

    const trip = new Trip({
      legs: [
        {
          lorryReceipt: lr._id,
          fromLocation: lr.fromLocation,
          toLocation: lr.toLocation,
          freight,
          addedBy: vm._id,
          date: assignedAt,
        },
      ],
      vehicle: vehicle._id,
      driver: driver._id,
      vehicleMaster: vm._id,
      createdBy: vm._id,
      status: "running",
      startDate: assignedAt,
      dieselLiters: randInt(15, 90),
      dieselPricePerLiter: round2(90 + Math.random() * 15),
      distanceKm: randInt(60, 650),
      gpsKm: 0,
      lrRate: round2(freight / randInt(5, 20)),
      freightRate: freight,
      expenses: pickN(TRIP_EXPENSE_CATEGORIES, randInt(1, 4)).map((category) => ({ category, amount: randInt(100, 3000) })),
      logs: [{ status: "running", note: "Trip started", updatedBy: vm._id, at: assignedAt }],
      createdAt: assignedAt,
    });
    trip.gpsKm = Math.max(1, trip.distanceKm + randInt(-15, 15));
    audit(vm, "trip.assignVehicle", "Trip", trip._id, null, { vehicle: vehicle._id, lorryReceipt: lr._id }, assignedAt);

    // Deliver the (only) leg.
    const deliveredAt = forward(assignedAt, randInt(6, 72) * 60 * 60 * 1000);
    trip.legs[0].deliveredAt = deliveredAt;
    trip.legs[0].deliveredBy = vm._id;
    trip.legs[0].odometerReading = vehicle.odometerReading + trip.distanceKm;
    trip.legs[0].advance = 0;
    lr.status = "used";
    lr.trip = trip._id;

    if (slip.balance <= 0) {
      trip.status = "completed";
      trip.closedBy = vm._id;
      trip.closedAt = deliveredAt;
      trip.endDate = deliveredAt;
      trip.logs.push({ status: "completed", note: "Trip closed", updatedBy: vm._id, at: deliveredAt });
      audit(vm, "trip.close", "Trip", trip._id, { status: "running" }, { status: "completed" }, deliveredAt);
    } else {
      const settleRoll = Math.random() * 100;
      if (settleRoll < 50) {
        // Closing payment already verified — trip completed, balance settled.
        const submittedAt = forward(deliveredAt, randInt(1, 10) * 60 * 60 * 1000);
        const accountant = pick(accountants);
        const verifiedAt = forward(submittedAt, randInt(1, 20) * 60 * 60 * 1000);
        const settledAmount = slip.balance;
        slip.advance += settledAmount;
        slip.balance = 0;
        await slip.save();

        trip.closurePayment = {
          status: "verified",
          amount: settledAmount,
          paymentMethod: pick(["cash", "online", "upi"]),
          proofUrl: null,
          submittedBy: vm._id,
          submittedAt,
          verifiedBy: accountant._id,
          verifiedAt,
        };
        trip.status = "completed";
        trip.closedBy = accountant._id;
        trip.closedAt = verifiedAt;
        trip.endDate = verifiedAt;
        trip.logs.push({ status: "closure_payment_submitted", note: `Closing payment of ₹${settledAmount} submitted`, updatedBy: vm._id, at: submittedAt });
        trip.logs.push({ status: "completed", note: "Trip closed — closing payment verified", updatedBy: accountant._id, at: verifiedAt });
        audit(accountant, "trip.verifyClosingPayment", "Trip", trip._id, { status: "pending_verification" }, { status: "verified" }, verifiedAt);

        const party = lr.isTemporary
          ? `Walk-in — ${lr.consignor.name}`
          : clients.find((c) => String(c._id) === String(lr.client))?.companyName || "Client";
        ledgerEntries.push({
          mode: trip.closurePayment.paymentMethod === "cash" ? "cash" : "online",
          direction: "received",
          amount: settledAmount,
          party,
          description: `Closing balance payment for trip`,
          relatedTrip: trip._id,
          recordedBy: accountant._id,
          date: verifiedAt,
          createdAt: verifiedAt,
        });
      } else if (settleRoll < 75) {
        // Submitted, awaiting Accountant verification right now.
        const submittedAt = forward(deliveredAt, randInt(1, 10) * 60 * 60 * 1000);
        trip.closurePayment = {
          status: "pending_verification",
          amount: slip.balance,
          paymentMethod: pick(["cash", "online"]),
          proofUrl: null,
          submittedBy: vm._id,
          submittedAt,
        };
        trip.logs.push({ status: "closure_payment_submitted", note: `Closing payment of ₹${slip.balance} submitted for verification`, updatedBy: vm._id, at: submittedAt });
        // trip.status stays "running"
      }
      // else: leg delivered, balance outstanding, nothing submitted yet — trip stays "running".
    }

    await trip.save();
    await lr.save();
    if (trip.status === "running") {
      vehicle.status = "on_trip";
      await vehicle.save();
    }
    tripCount += 1;
  }
  console.log(`[seed] Created ${tripCount} trips.`);

  // A few verified LRs held back above get a trip that's assigned but not
  // yet delivered (pipeline variety — "in transit, nothing to close yet").
  for (const { lr, loadingSlip: slip } of heldBackForPendingDelivery) {
    const vm = pick(vehicleMasters);
    const vehicle =
      pick(vehicles.filter((v) => String(v.assignedVehicleMaster) === String(vm._id) && v.status === "available")) ||
      pick(vehicles.filter((v) => v.status === "available")) ||
      pick(vehicles);
    const driver = pick(drivers);
    const assignedAt = daysAgo(randInt(1, 3));
    const trip = await Trip.create({
      legs: [{ lorryReceipt: lr._id, fromLocation: lr.fromLocation, toLocation: lr.toLocation, freight: slip?.freightRate || 0, addedBy: vm._id, date: assignedAt }],
      vehicle: vehicle._id,
      driver: driver._id,
      vehicleMaster: vm._id,
      createdBy: vm._id,
      status: "running",
      startDate: assignedAt,
      freightRate: slip?.freightRate || 0,
      logs: [{ status: "running", note: "Trip started", updatedBy: vm._id, at: assignedAt }],
      createdAt: assignedAt,
    });
    lr.status = "assigned";
    lr.trip = trip._id;
    await lr.save();
    vehicle.status = "on_trip";
    await vehicle.save();
    audit(vm, "trip.assignVehicle", "Trip", trip._id, null, { vehicle: vehicle._id, lorryReceipt: lr._id }, assignedAt);
    tripCount += 1;
  }

  // A couple of vehicles flagged under maintenance, for status-page variety.
  for (const vehicle of pickN(
    vehicles.filter((v) => v.status === "available"),
    2
  )) {
    vehicle.status = "maintenance";
    await vehicle.save();
  }

  // ---------------------------------------------------------------------
  // Goods Receipts — bundle each client's "used" LRs not yet swept.
  // ---------------------------------------------------------------------
  console.log("[seed] Creating Goods Receipts...");
  for (const client of pickN(clients, 6)) {
    const usedLrs = allLorryReceipts.filter(
      (lr) => String(lr.client) === String(client._id) && lr.status === "used" && !lr.goodsReceipt
    );
    if (usedLrs.length === 0) continue;
    grSeq += 1;
    const issuedAt = daysAgo(randInt(1, 10));
    const gr = await GoodsReceipt.create({
      grNumber: grSeq,
      client: client._id,
      lorryReceipts: usedLrs.map((lr) => lr._id),
      issuedBy: admin._id,
      createdAt: issuedAt,
    });
    await LorryReceipt.updateMany({ _id: { $in: usedLrs.map((lr) => lr._id) } }, { goodsReceipt: gr._id });
  }

  // ---------------------------------------------------------------------
  // Driver payment requests
  // ---------------------------------------------------------------------
  console.log("[seed] Creating driver payment requests...");
  const paymentReasons = ["Diesel top-up", "Toll charges", "Vehicle repair", "Police fine", "Loading labour", "Parking fee"];
  for (let i = 0; i < 22; i++) {
    const driver = pick(drivers);
    const vm = pick(vehicleMasters);
    const amount = randInt(300, 8000);
    const requestedAt = daysAgo(randInt(1, 28));
    const roll = Math.random() * 100;

    const payment = new Payment({
      requestedBy: driver._id,
      reason: pick(paymentReasons),
      amount,
      mode: chance(60) ? "cash" : "online",
      status: "pending_vehicle_master",
      createdAt: requestedAt,
    });

    if (roll >= 15) {
      const decidedAt = forward(requestedAt, randInt(1, 20) * 60 * 60 * 1000);
      const approved = roll < 90;
      payment.status = approved ? "approved_by_vehicle_master" : "rejected";
      payment.vehicleMasterApprovedBy = vm._id;
      payment.vehicleMasterApprovedAt = decidedAt;
      audit(vm, "payment.vehicleMasterDecide", "Payment", payment._id, { status: "pending_vehicle_master" }, { status: payment.status }, decidedAt);

      if (approved && roll < 75) {
        const accountant = pick(accountants);
        const paidAt = forward(decidedAt, randInt(1, 30) * 60 * 60 * 1000);
        payment.status = "paid";
        payment.paidBy = accountant._id;
        payment.paidAt = paidAt;
        audit(accountant, "payment.accountantPay", "Payment", payment._id, { status: "approved_by_vehicle_master" }, { status: "paid", amount }, paidAt);

        ledgerEntries.push({
          mode: payment.mode,
          direction: "sent",
          amount,
          party: driver.name,
          description: payment.reason,
          relatedPayment: payment._id,
          recordedBy: accountant._id,
          date: paidAt,
          createdAt: paidAt,
        });
      }
    }

    await payment.save();
  }

  // ---------------------------------------------------------------------
  // Inventory — items + procurement requests
  // ---------------------------------------------------------------------
  console.log("[seed] Creating inventory items & purchases...");
  const inventoryDefs = [
    { name: "Truck Tyres", unit: "pcs" },
    { name: "Engine Oil (15W-40)", unit: "liters" },
    { name: "Brake Pads", unit: "sets" },
    { name: "Diesel Filters", unit: "pcs" },
    { name: "Batteries", unit: "pcs" },
    { name: "Grease", unit: "kg" },
    { name: "Wiper Blades", unit: "pcs" },
    { name: "Tarpaulin Sheets", unit: "pcs" },
  ];
  const inventoryItems = [];
  for (const def of inventoryDefs) {
    inventoryItems.push(await InventoryItem.create({ ...def, quantity: 0, totalReceived: 0, totalUsed: 0, updatedBy: entryMaster._id, createdAt: daysAgo(randInt(30, 40)) }));
  }

  for (let i = 0; i < 14; i++) {
    const item = pick(inventoryItems);
    const quantity = randInt(5, 50);
    const amount = quantity * randInt(150, 2500);
    const requestedAt = daysAgo(randInt(1, 28));
    const purchase = new InventoryPurchase({
      itemName: item.name,
      quantity,
      unit: item.unit,
      amount,
      paymentMethod: pick(["cash", "online", "upi"]),
      notes: chance(30) ? "Bulk order — quarterly restock" : undefined,
      requestedBy: chance(70) ? entryMaster._id : coAdmin._id,
      status: "pending_payment",
      createdAt: requestedAt,
    });

    if (chance(85)) {
      const accountant = pick(accountants);
      const paidAt = forward(requestedAt, randInt(2, 48) * 60 * 60 * 1000);
      const rejected = chance(10);
      if (rejected) {
        purchase.status = "rejected";
        purchase.rejectionReason = "Price too high — renegotiate with vendor";
        audit(accountant, "inventoryPurchase.reject", "InventoryPurchase", purchase._id, { status: "pending_payment" }, { status: "rejected" }, paidAt);
      } else {
        purchase.status = "paid";
        purchase.paidBy = accountant._id;
        purchase.paidAt = paidAt;
        item.totalReceived += quantity;
        item.quantity += quantity;
        item.updatedBy = accountant._id;
        await item.save();
        purchase.inventoryItem = item._id;
        audit(accountant, "inventoryPurchase.pay", "InventoryPurchase", purchase._id, { status: "pending_payment" }, { status: "paid", amount }, paidAt);

        ledgerEntries.push({
          mode: purchase.paymentMethod === "cash" ? "cash" : "online",
          direction: "sent",
          amount,
          party: item.name,
          description: `Inventory purchase — ${quantity} ${item.unit} of "${item.name}"`,
          relatedInventoryPurchase: purchase._id,
          recordedBy: accountant._id,
          date: paidAt,
          createdAt: paidAt,
        });

        if (chance(60)) {
          const used = randInt(1, Math.max(1, Math.floor(quantity * 0.6)));
          item.totalUsed += used;
          item.quantity -= used;
          item.usageLog.push({ quantityUsed: used, note: "Used for scheduled maintenance", recordedBy: entryMaster._id, usedAt: forward(paidAt, randInt(1, 10) * DAY_MS) });
          await item.save();
        }
      }
    }

    await purchase.save();
  }

  // ---------------------------------------------------------------------
  // Vehicle maintenance logs
  // ---------------------------------------------------------------------
  console.log("[seed] Creating maintenance logs...");
  const maintenanceDescriptions = [
    "Oil change & filter replacement", "Tyre rotation", "Brake pad replacement",
    "Battery replacement", "Clutch plate service", "AC gas refill",
    "Suspension repair", "General service", "Puncture repair", "Wheel alignment",
  ];
  for (let i = 0; i < 16; i++) {
    const vehicle = pick(vehicles);
    await VehicleMaintenance.create({
      vehicle: vehicle._id,
      recordedBy: vehicle.assignedVehicleMaster,
      description: pick(maintenanceDescriptions),
      cost: randInt(500, 15000),
      date: daysAgo(randInt(1, 30)),
      createdAt: daysAgo(randInt(1, 30)),
    });
  }

  // ---------------------------------------------------------------------
  // Persist ledger entries, audit logs, counters
  // ---------------------------------------------------------------------
  console.log(`[seed] Writing ${ledgerEntries.length} ledger entries and ${auditLogs.length} audit log entries...`);
  if (ledgerEntries.length > 0) await LedgerEntry.insertMany(ledgerEntries);
  if (auditLogs.length > 0) await AuditLog.insertMany(auditLogs);

  await Counter.deleteMany({ key: { $in: ["LR", "BILL", "LOADING_SLIP", "GR"] } });
  await Counter.insertMany([
    { key: "LR", seq: lrSeq },
    { key: "BILL", seq: billSeq },
    { key: "LOADING_SLIP", seq: slipSeq },
    { key: "GR", seq: grSeq },
  ]);

  console.log("\n[seed] Done.");
  console.log(`[seed]  - ${clients.length} clients, ${drivers.length} drivers, ${vehicles.length} vehicles`);
  console.log(`[seed]  - ${vehicleMasters.length} Vehicle Masters, ${accountants.length} Accountants, 1 Entry Master`);
  console.log(`[seed]  - ${allLorryReceipts.length} Lorry Receipts, ${slipSeq} Loading Slips, ${tripCount} Trips, ${grSeq} Goods Receipts`);
  console.log(`[seed]  - ${ledgerEntries.length} ledger entries, ${auditLogs.length} audit log entries`);
  console.log(`\n[seed] All seeded users share the password: ${DEFAULT_PASSWORD}`);
  console.log("[seed] Sign in as admin@osr.test, coadmin@osr.test, vehiclemaster1@osr.test, accountant1@osr.test, entrymaster@osr.test, or any *@client.test / *@driver.test address.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
