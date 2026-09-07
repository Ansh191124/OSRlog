import Payment from "../models/Payment.js";
import LedgerEntry from "../models/LedgerEntry.js";
import Vehicle from "../models/Vehicle.js";
import { notifyUser, notifyAccountants } from "../utils/notify.js";
import { recordAudit } from "../utils/audit.js";
import { ROLES, EMPLOYEE_CATEGORIES } from "../config/roles.js";

const PAYMENT_POPULATE = [
  { path: "requestedBy", select: "name email" },
  { path: "trip", select: "fromLocation toLocation" },
  { path: "vehicleMasterApprovedBy", select: "name" },
  { path: "paidBy", select: "name" },
];

// Driver: "Request -> Payments" for various trip expenses.
export async function createPaymentRequest(req, res) {
  const { reason, amount, mode, tripId } = req.body;
  if (!reason || !amount) {
    return res.status(400).json({ message: "reason and amount are required" });
  }

  const payment = await Payment.create({
    requestedBy: req.user._id,
    trip: tripId || null,
    reason,
    amount,
    mode: mode === "online" ? "online" : "cash",
  });

  const myVehicleMasterId = await Vehicle.findOne({ currentDriver: req.user._id }).distinct("assignedVehicleMaster");
  if (myVehicleMasterId[0]) {
    await notifyUser(myVehicleMasterId[0], {
      title: "New driver payment request",
      message: `${req.user.name} requested ₹${amount} for "${reason}".`,
      type: "payment",
      link: "/vehicle-master/approvement",
    });
  }

  res.status(201).json({ payment });
}

// Scoped listing: Driver sees their own requests; Vehicle Master sees
// requests from drivers on their own vehicles; Accountant/Admin/Co-Admin see
// everything relevant to their stage of the workflow.
export async function listPayments(req, res) {
  const filter = {};

  if (req.scope === ROLES.DRIVER) {
    filter.requestedBy = req.user._id;
  } else if (req.scope === EMPLOYEE_CATEGORIES.VEHICLE_MASTER) {
    const myDriverIds = await Vehicle.find({ assignedVehicleMaster: req.user._id }).distinct("currentDriver");
    filter.requestedBy = { $in: myDriverIds.filter(Boolean) };
  }
  // accountant/admin/co_admin see all — the Accountant Overview's "not other
  // accountant transaction" exclusion applies to already-paid entries, handled
  // by the ledger endpoints, not this request queue.

  const payments = await Payment.find(filter).populate(PAYMENT_POPULATE).sort({ createdAt: -1 });
  res.json({ payments });
}

// Vehicle Master approves or rejects a driver's expense request.
export async function vehicleMasterDecide(req, res) {
  const { id } = req.params;
  const { decision } = req.body;
  if (!["approved", "rejected"].includes(decision)) {
    return res.status(400).json({ message: "decision must be 'approved' or 'rejected'" });
  }

  const payment = await Payment.findById(id);
  if (!payment) return res.status(404).json({ message: "Payment request not found" });
  if (payment.status !== "pending_vehicle_master") {
    return res.status(400).json({ message: "This request has already been decided" });
  }

  // Confirm the requesting driver is on one of this Vehicle Master's vehicles.
  const isMyDriver = await Vehicle.exists({
    assignedVehicleMaster: req.user._id,
    currentDriver: payment.requestedBy,
  });
  if (!isMyDriver) return res.status(403).json({ message: "Not your driver" });

  payment.status = decision === "approved" ? "approved_by_vehicle_master" : "rejected";
  payment.vehicleMasterApprovedBy = req.user._id;
  payment.vehicleMasterApprovedAt = new Date();
  await payment.save();

  await recordAudit({
    user: req.user,
    action: "payment.vehicleMasterDecide",
    entityType: "Payment",
    entityId: payment._id,
    before: { status: "pending_vehicle_master" },
    after: { status: payment.status },
  });

  if (decision === "approved") {
    await notifyAccountants({
      title: "Payment ready to process",
      message: `A ₹${payment.amount} request for "${payment.reason}" is approved and awaiting payment.`,
      type: "payment",
      link: "/accountant/requests",
    });
  } else {
    await notifyUser(payment.requestedBy, {
      title: "Payment request rejected",
      message: `Your request for "${payment.reason}" was rejected.`,
      type: "payment",
      link: "/driver/payments",
    });
  }

  const populated = await Payment.findById(payment._id).populate(PAYMENT_POPULATE);
  res.json({ payment: populated });
}

// Accountant executes the payment and records the ledger confirmation.
export async function accountantPay(req, res) {
  const { id } = req.params;
  const { proofUrl } = req.body;

  const payment = await Payment.findById(id).populate("requestedBy", "name");
  if (!payment) return res.status(404).json({ message: "Payment request not found" });
  if (payment.status !== "approved_by_vehicle_master") {
    return res.status(400).json({ message: "Only Vehicle-Master-approved requests can be paid" });
  }

  payment.status = "paid";
  payment.paidBy = req.user._id;
  payment.paidAt = new Date();
  if (proofUrl) payment.proofUrl = proofUrl;
  await payment.save();

  await LedgerEntry.create({
    mode: payment.mode,
    direction: "sent",
    amount: payment.amount,
    party: payment.requestedBy?.name || "Driver",
    description: payment.reason,
    relatedPayment: payment._id,
    relatedTrip: payment.trip || null,
    recordedBy: req.user._id,
    proofUrl: proofUrl || null,
  });

  await recordAudit({
    user: req.user,
    action: "payment.accountantPay",
    entityType: "Payment",
    entityId: payment._id,
    before: { status: "approved_by_vehicle_master" },
    after: { status: payment.status, amount: payment.amount },
  });

  await notifyUser(payment.requestedBy, {
    title: "Payment received",
    message: `Your ₹${payment.amount} request for "${payment.reason}" has been paid.`,
    type: "payment",
    link: "/driver/payments",
  });

  const populated = await Payment.findById(payment._id).populate(PAYMENT_POPULATE);
  res.json({ payment: populated });
}
