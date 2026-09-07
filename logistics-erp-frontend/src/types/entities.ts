export interface Vehicle {
  _id: string;
  registrationNumber: string;
  type?: string;
  capacity?: string;
  status: "available" | "on_trip" | "maintenance" | "inactive";
  assignedVehicleMaster?: { _id: string; name: string; email: string } | null;
  currentDriver?: { _id: string; name: string; email: string } | null;
  baseLocation?: string;
  rcNumber?: string;
  rcPhotoKey?: string | null;
  ownershipType?: "company" | "third_party";
  ownerName?: string;
  odometerReading?: number;
  tyreCount?: number | null;
  vehicleDimension?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  alternatePhone?: string;
  role: "employee" | "client" | "driver";
  employeeCategory?: "vehicle_master" | "entry_master" | "accountant" | "temporary" | null;
  isTemporary: boolean;
  temporaryScope?: "admin" | "co_admin" | null;
  isActive: boolean;
  // Driver
  licenseNumber?: string;
  licenseExpiry?: string;
  licenseType?: string;
  licensePhotoKey?: string | null;
  docProofKey?: string | null;
  dob?: string;
  employmentType?: "permanent" | "temporary";
  driverType?: "company" | "independent";
  // Client
  companyName?: string;
  address?: string;
  gstin?: string;
  businessType?: string;
  // Employee
  guardianName?: string;
  aadharNumber?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverSummary extends PersonUser {
  tripCount: number;
  totalEarnings: number;
}

export interface VehicleMaintenanceRecord {
  _id: string;
  vehicle: { _id: string; registrationNumber: string };
  recordedBy: { _id: string; name: string };
  description: string;
  cost: number;
  date: string;
  createdAt: string;
}

export const TRIP_EXPENSE_CATEGORIES = [
  "Dala",
  "Border",
  "Police",
  "Grease+Air",
  "Guide",
  "Parking",
  "Fooding",
  "Urea Nagad",
  "Kiraya",
  "Toll Tax",
  "Diesel",
  "Salary",
  "Incentive",
  "Urea",
  "Labour",
] as const;
export type TripExpenseCategory = (typeof TRIP_EXPENSE_CATEGORIES)[number];

export interface TripLeg {
  _id: string;
  lorryReceipt: {
    _id: string;
    lrNumber: number;
    billNumber: number;
    fromLocation?: string;
    toLocation?: string;
    status: string;
    client?: { _id: string; name: string; companyName?: string };
    loadingSlip?: { _id: string; slipNumber: number; totalAmount: number; advance: number; balance: number; status: string } | null;
  };
  fromLocation?: string;
  toLocation?: string;
  freight: number;
  odometerReading?: number | null;
  advance: number;
  date: string;
  addedBy?: { _id: string; name: string };
  deliveredAt?: string | null;
  deliveredBy?: { _id: string; name: string } | null;
}

export interface Trip {
  _id: string;
  legs: TripLeg[];
  vehicle: { _id: string; registrationNumber: string };
  driver?: { _id: string; name: string } | null;
  vehicleMaster?: { _id: string; name: string };
  status: "created" | "running" | "completed" | "closed";
  fromLocation?: string | null;
  toLocation?: string | null;
  allLegsDelivered?: boolean;
  startDate?: string;
  endDate?: string | null;
  timeIn?: string;
  timeOut?: string;
  dieselLiters: number;
  dieselPricePerLiter: number;
  dieselTotalCost: number;
  lrRate: number;
  freightRate: number;
  distanceKm: number;
  gpsKm: number;
  mileage: number;
  expenses: { category: TripExpenseCategory; amount: number }[];
  closurePayment?: {
    status: "none" | "pending_verification" | "verified" | "rejected";
    amount: number;
    paymentMethod?: PaymentMethod | null;
    proofUrl?: string | null;
    proofSignedUrl?: string | null;
    submittedBy?: { _id: string; name: string } | null;
    submittedAt?: string | null;
    verifiedBy?: { _id: string; name: string } | null;
    verifiedAt?: string | null;
    rejectionReason?: string | null;
  };
  createdAt: string;
}

export interface LrParty {
  name: string;
  address?: string;
  gstin?: string;
}

export interface LorryReceipt {
  _id: string;
  lrNumber: number;
  billNumber: number;
  client?: { _id: string; name: string; email: string; companyName?: string; gstin?: string } | null;
  isTemporary?: boolean;
  requestedBy: { _id: string; name: string };
  approvedBy?: { _id: string; name: string } | null;
  status: "requested" | "approved" | "rejected" | "assigned" | "used";
  fromLocation: string;
  toLocation: string;
  goodsDescription?: string;
  truckSizeFt?: number | null;
  consignor: LrParty;
  consignee: LrParty;
  trip?: string | null;
  goodsReceipt?: string | null;
  loadingSlip?: { _id: string; slipNumber: number; status: LoadingSlipStatus; totalAmount?: number } | null;
  createdAt: string;
}

export const LOADING_SLIP_STATUSES = [
  "awaiting_payment",
  "payment_submitted",
  "verified",
  "payment_rejected",
] as const;
export type LoadingSlipStatus = (typeof LOADING_SLIP_STATUSES)[number];

export const PAYMENT_METHODS = ["cash", "online", "upi", "bank_transfer", "cheque"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface LoadingSlip {
  _id: string;
  slipNumber: number;
  lorryReceipt: {
    _id: string;
    lrNumber: number;
    billNumber: number;
    fromLocation: string;
    toLocation: string;
    goodsDescription?: string;
    consignor: LrParty;
    consignee: LrParty;
  };
  client?: { _id: string; name: string; email: string; companyName?: string } | null;
  isTemporary?: boolean;
  createdBy: { _id: string; name: string };
  freightRate: number;
  otherCharges: number;
  advance: number;
  totalAmount: number;
  balance: number;
  paymentMode: "consignor_pays" | "consignee_pays";
  paymentMethod: PaymentMethod;
  status: LoadingSlipStatus;
  paymentProofUrl?: string | null;
  paymentProofSignedUrl?: string | null;
  clientSubmittedAt?: string | null;
  verifiedBy?: { _id: string; name: string } | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface LRReservation {
  _id: string;
  client: { _id: string; name: string; email: string; companyName?: string };
  requestedCount: number;
  status: "pending" | "approved" | "rejected";
  approvedCount: number;
  startNumber?: number | null;
  endNumber?: number | null;
  nextNumber?: number | null;
  createdAt: string;
}

export interface ClientLrSummary {
  reserved: number;
  used: number;
  left: number;
  requested: number;
}

export interface GoodsReceipt {
  _id: string;
  grNumber: number;
  client: { _id: string; name: string; companyName?: string; gstin?: string };
  lorryReceipts: {
    _id: string;
    lrNumber: number;
    billNumber: number;
    fromLocation: string;
    toLocation: string;
    loadingSlip?: { slipNumber: number; freightRate: number; totalAmount: number } | null;
  }[];
  issuedBy: { _id: string; name: string };
  createdAt: string;
}

export interface InventoryUsageLogEntry {
  quantityUsed: number;
  note?: string;
  recordedBy?: { _id: string; name: string };
  usedAt: string;
}

export interface InventoryItem {
  _id: string;
  name: string;
  quantity: number;
  totalReceived: number;
  totalUsed: number;
  usageLog?: InventoryUsageLogEntry[];
  unit?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const INVENTORY_PURCHASE_STATUSES = ["pending_payment", "paid", "rejected"] as const;
export type InventoryPurchaseStatus = (typeof INVENTORY_PURCHASE_STATUSES)[number];

export interface InventoryPurchase {
  _id: string;
  itemName: string;
  quantity: number;
  unit?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  requestedBy: { _id: string; name: string };
  status: InventoryPurchaseStatus;
  paidBy?: { _id: string; name: string } | null;
  paidAt?: string | null;
  proofUrl?: string | null;
  rejectionReason?: string | null;
  inventoryItem?: { _id: string; name: string; quantity: number; unit?: string } | null;
  createdAt: string;
}

export interface AppNotification {
  _id: string;
  title: string;
  message?: string;
  type: string;
  read: boolean;
  link?: string | null;
  createdAt: string;
}

export interface AuditLog {
  _id: string;
  user: { _id: string; name: string; email: string };
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  at: string;
}

export interface TripCounts {
  running: number;
  completed: number;
  overall: number;
}

export interface AdminOverviewData {
  range: "daily" | "weekly" | "monthly" | "yearly";
  plSeries: { label: string; received: number; sent: number; net: number; pending: number }[];
  trips: TripCounts;
  pending: { receivable: number; payable: number; total: number };
  employeeCount: number;
  driverCount: number;
}

export interface CoAdminOverviewData {
  runningTrips: number;
  completedTrips: number;
  vehicleStatus: { available: number; on_trip: number; maintenance: number; inactive: number };
  employeeCount: number;
  driverCount: number;
}

export interface Payment {
  _id: string;
  requestedBy: { _id: string; name: string; email: string };
  trip?: { _id: string; fromLocation?: string; toLocation?: string } | null;
  reason: string;
  amount: number;
  mode: "cash" | "online";
  status: "pending_vehicle_master" | "approved_by_vehicle_master" | "rejected" | "paid";
  vehicleMasterApprovedBy?: { _id: string; name: string } | null;
  vehicleMasterApprovedAt?: string | null;
  paidBy?: { _id: string; name: string } | null;
  paidAt?: string | null;
  proofUrl?: string | null;
  createdAt: string;
}

export interface LedgerEntry {
  _id: string;
  mode: "cash" | "online";
  direction: "received" | "sent";
  amount: number;
  party?: string;
  description?: string;
  relatedPayment?: { _id: string; reason: string; amount: number } | null;
  relatedLoadingSlip?: { _id: string; slipNumber: number } | null;
  relatedInventoryPurchase?: { _id: string; itemName: string; quantity: number } | null;
  recordedBy: { _id: string; name: string };
  proofUrl?: string | null;
  date: string;
  createdAt: string;
}

export interface AccountantOverviewSummary {
  received: number;
  sent: number;
  pending: number;
}

export interface VehicleAssignOverview {
  byMaster: {
    vehicleMaster: { _id: string; name: string; email: string };
    vehicleCount: number;
    vehicles: { _id: string; registrationNumber: string; status: Vehicle["status"] }[];
  }[];
  unassigned: { _id: string; registrationNumber: string; status: Vehicle["status"] }[];
}
