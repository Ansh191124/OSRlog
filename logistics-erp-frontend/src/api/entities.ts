import { apiClient } from "./client";
import type {
  Vehicle,
  PersonUser,
  DriverSummary,
  VehicleMaintenanceRecord,
  Trip,
  InventoryItem,
  VehicleAssignOverview,
  LorryReceipt,
  LRReservation,
  ClientLrSummary,
  GoodsReceipt,
  LoadingSlip,
  PaymentMethod,
  InventoryPurchase,
  Payment,
  LedgerEntry,
  AccountantOverviewSummary,
  AppNotification,
  AdminOverviewData,
  CoAdminOverviewData,
  AuditLog,
} from "../types/entities";

export const vehicleApi = {
  list: async () => (await apiClient.get<{ vehicles: Vehicle[] }>("/vehicles")).data.vehicles,
  create: async (payload: Partial<Vehicle>) =>
    (await apiClient.post<{ vehicle: Vehicle }>("/vehicles", payload)).data.vehicle,
  update: async (id: string, payload: Partial<Vehicle>) =>
    (await apiClient.patch<{ vehicle: Vehicle }>(`/vehicles/${id}`, payload)).data.vehicle,
  assignOverview: async () =>
    (await apiClient.get<VehicleAssignOverview>("/vehicles/assign-overview")).data,
  bulkAssign: async (vehicleIds: string[], vehicleMasterId: string) =>
    (await apiClient.post<{ vehicles: Vehicle[] }>("/vehicles/bulk-assign", { vehicleIds, vehicleMasterId }))
      .data.vehicles,
};

function personApi(resource: "drivers" | "clients" | "employees", pluralKey: string) {
  return {
    list: async () =>
      (await apiClient.get<Record<string, PersonUser[]>>(`/${resource}`)).data[pluralKey],
    create: async (payload: Partial<PersonUser>) =>
      (await apiClient.post<{ user: PersonUser; tempPassword: string }>(`/${resource}`, payload)).data,
    update: async (id: string, payload: Partial<PersonUser>) =>
      (await apiClient.patch<{ user: PersonUser }>(`/${resource}/${id}`, payload)).data.user,
  };
}

export const driverApi = {
  ...personApi("drivers", "drivers"),
  summary: async () => (await apiClient.get<{ drivers: DriverSummary[] }>("/drivers/summary")).data.drivers,
};
export const clientApi = personApi("clients", "clients");
export const employeeApi = personApi("employees", "employees");

export const accessApi = {
  listEmployees: async () =>
    (await apiClient.get<{ employees: PersonUser[] }>("/access/employees")).data.employees,
  updateAccess: async (
    id: string,
    payload: { employeeCategory?: string | null; isTemporary?: boolean; temporaryScope?: string | null }
  ) => (await apiClient.patch<{ user: PersonUser }>(`/access/employees/${id}`, payload)).data.user,
};

export const maintenanceApi = {
  list: async () =>
    (await apiClient.get<{ records: VehicleMaintenanceRecord[] }>("/maintenance")).data.records,
  create: async (payload: { vehicleId: string; description: string; cost?: number; date?: string }) =>
    (await apiClient.post<{ record: VehicleMaintenanceRecord }>("/maintenance", payload)).data.record,
};

export const inventoryApi = {
  list: async () => (await apiClient.get<{ items: InventoryItem[] }>("/inventory")).data.items,
  create: async (payload: Partial<InventoryItem>) =>
    (await apiClient.post<{ item: InventoryItem }>("/inventory", payload)).data.item,
  update: async (id: string, payload: Partial<InventoryItem>) =>
    (await apiClient.patch<{ item: InventoryItem }>(`/inventory/${id}`, payload)).data.item,
  recordUsage: async (id: string, quantityUsed: number, note?: string) =>
    (await apiClient.patch<{ item: InventoryItem }>(`/inventory/${id}/usage`, { quantityUsed, note })).data.item,
};

export interface InventoryPurchaseInput {
  itemName: string;
  quantity: number;
  unit?: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
}

export const inventoryPurchaseApi = {
  list: async () =>
    (await apiClient.get<{ purchases: InventoryPurchase[] }>("/inventory-purchases")).data.purchases,
  create: async (payload: InventoryPurchaseInput) =>
    (await apiClient.post<{ purchase: InventoryPurchase }>("/inventory-purchases", payload)).data.purchase,
  pay: async (id: string, proofUrl?: string) =>
    (await apiClient.patch<{ purchase: InventoryPurchase }>(`/inventory-purchases/${id}/pay`, { proofUrl }))
      .data.purchase,
  reject: async (id: string, rejectionReason?: string) =>
    (await apiClient.patch<{ purchase: InventoryPurchase }>(`/inventory-purchases/${id}/reject`, { rejectionReason }))
      .data.purchase,
};

export const reservationApi = {
  list: async () => (await apiClient.get<{ reservations: LRReservation[] }>("/reservations")).data.reservations,
  create: async (requestedCount: number) =>
    (await apiClient.post<{ reservation: LRReservation }>("/reservations", { requestedCount })).data.reservation,
  decide: async (id: string, decision: "approved" | "rejected", approvedCount?: number) =>
    (await apiClient.patch<{ reservation: LRReservation }>(`/reservations/${id}/decide`, { decision, approvedCount }))
      .data.reservation,
  mySummary: async () => (await apiClient.get<ClientLrSummary>("/reservations/my-summary")).data,
};

export interface LorryReceiptInput {
  fromLocation: string;
  toLocation: string;
  goodsDescription?: string;
  clientId?: string;
  isTemporary?: boolean;
  truckSizeFt?: number | null;
  consignor: { name: string; address?: string };
  consignee: { name: string; address?: string };
}

export const lorryReceiptApi = {
  list: async (params?: { fromLocation?: string; sortBy?: "date" | "lrNumber"; order?: "asc" | "desc" }) =>
    (await apiClient.get<{ lorryReceipts: LorryReceipt[] }>("/lorry-receipts", { params })).data.lorryReceipts,
  get: async (id: string) => (await apiClient.get<{ lorryReceipt: LorryReceipt }>(`/lorry-receipts/${id}`)).data.lorryReceipt,
  create: async (payload: LorryReceiptInput) =>
    (await apiClient.post<{ lorryReceipt: LorryReceipt }>("/lorry-receipts", payload)).data.lorryReceipt,
  decide: async (id: string, decision: "approved" | "rejected") =>
    (await apiClient.patch<{ lorryReceipt: LorryReceipt }>(`/lorry-receipts/${id}/decide`, { decision }))
      .data.lorryReceipt,
  downloadPdf: async (id: string, lrNumber: number) =>
    downloadBlob(`/lorry-receipts/${id}/pdf`, `LR-${lrNumber}.pdf`),
};

export const goodsReceiptApi = {
  list: async () => (await apiClient.get<{ goodsReceipts: GoodsReceipt[] }>("/goods-receipts")).data.goodsReceipts,
  previewEligible: async (clientId: string) =>
    (
      await apiClient.get<{ client: { _id: string; name: string; companyName?: string }; lorryReceipts: LorryReceipt[] }>(
        `/goods-receipts/eligible/${clientId}`
      )
    ).data,
  generate: async (clientId: string) =>
    (await apiClient.post<{ goodsReceipt: GoodsReceipt }>("/goods-receipts", { clientId })).data.goodsReceipt,
  downloadPdf: async (id: string, grNumber: number) =>
    downloadBlob(`/goods-receipts/${id}/pdf`, `GR-${grNumber}.pdf`),
};

export interface LoadingSlipInput {
  lorryReceiptId: string;
  freightRate?: number;
  otherCharges?: number;
  advance?: number;
  paymentMode?: "consignor_pays" | "consignee_pays";
  paymentMethod?: PaymentMethod;
}

export const loadingSlipApi = {
  list: async () => (await apiClient.get<{ loadingSlips: LoadingSlip[] }>("/loading-slips")).data.loadingSlips,
  get: async (id: string) => (await apiClient.get<{ loadingSlip: LoadingSlip }>(`/loading-slips/${id}`)).data.loadingSlip,
  create: async (payload: LoadingSlipInput) =>
    (await apiClient.post<{ loadingSlip: LoadingSlip }>("/loading-slips", payload)).data.loadingSlip,
  submitPayment: async (id: string, proofUrl?: string) =>
    (await apiClient.patch<{ loadingSlip: LoadingSlip }>(`/loading-slips/${id}/submit-payment`, { proofUrl }))
      .data.loadingSlip,
  verify: async (id: string, decision: "verified" | "rejected", rejectionReason?: string) =>
    (await apiClient.patch<{ loadingSlip: LoadingSlip }>(`/loading-slips/${id}/verify`, { decision, rejectionReason }))
      .data.loadingSlip,
  downloadPdf: async (id: string, slipNumber: number) =>
    downloadBlob(`/loading-slips/${id}/pdf`, `LoadingSlip-${slipNumber}.pdf`),
};

export const tripApi = {
  list: async () => (await apiClient.get<{ trips: Trip[] }>("/trips")).data.trips,
  get: async (id: string) => (await apiClient.get<{ trip: Trip }>(`/trips/${id}`)).data.trip,
  assign: async (payload: { lorryReceiptId: string; vehicleId: string; driverId?: string }) =>
    (await apiClient.post<{ trip: Trip }>("/trips/assign", payload)).data.trip,
  addLeg: async (tripId: string, lorryReceiptId: string) =>
    (await apiClient.post<{ trip: Trip }>(`/trips/${tripId}/legs`, { lorryReceiptId })).data.trip,
  deliverLeg: async (tripId: string, legId: string, payload: { odometerReading?: number; advance?: number }) =>
    (await apiClient.post<{ trip: Trip }>(`/trips/${tripId}/legs/${legId}/deliver`, payload)).data.trip,
  update: async (id: string, payload: Partial<Trip>) =>
    (await apiClient.patch<{ trip: Trip }>(`/trips/${id}`, payload)).data.trip,
  close: async (id: string) => (await apiClient.post<{ trip: Trip }>(`/trips/${id}/close`)).data.trip,
  submitClosingPayment: async (id: string, payload: { amount: number; paymentMethod: PaymentMethod; proofUrl?: string }) =>
    (await apiClient.patch<{ trip: Trip }>(`/trips/${id}/submit-closing-payment`, payload)).data.trip,
  verifyClosingPayment: async (id: string, decision: "verified" | "rejected", rejectionReason?: string) =>
    (await apiClient.patch<{ trip: Trip }>(`/trips/${id}/verify-closing-payment`, { decision, rejectionReason })).data.trip,
  downloadPdf: async (id: string, vehicleReg: string) => downloadBlob(`/trips/${id}/pdf`, `TripSheet-${vehicleReg}.pdf`),
  remove: async (id: string) => apiClient.delete(`/trips/${id}`),
};

export const paymentApi = {
  list: async () => (await apiClient.get<{ payments: Payment[] }>("/payments")).data.payments,
  create: async (payload: { reason: string; amount: number; mode?: "cash" | "online"; tripId?: string }) =>
    (await apiClient.post<{ payment: Payment }>("/payments", payload)).data.payment,
  vehicleMasterDecide: async (id: string, decision: "approved" | "rejected") =>
    (await apiClient.patch<{ payment: Payment }>(`/payments/${id}/vehicle-master-decide`, { decision })).data.payment,
  pay: async (id: string, proofUrl?: string) =>
    (await apiClient.patch<{ payment: Payment }>(`/payments/${id}/pay`, { proofUrl })).data.payment,
};

export const ledgerApi = {
  list: async (mode?: "cash" | "online") =>
    (await apiClient.get<{ entries: LedgerEntry[] }>("/ledger", { params: mode ? { mode } : {} })).data.entries,
  create: async (payload: {
    mode: "cash" | "online";
    direction: "received" | "sent";
    amount: number;
    party?: string;
    description?: string;
    proofUrl?: string;
  }) => (await apiClient.post<{ entry: LedgerEntry }>("/ledger", payload)).data.entry,
  update: async (id: string, payload: Partial<LedgerEntry>) =>
    (await apiClient.patch<{ entry: LedgerEntry }>(`/ledger/${id}`, payload)).data.entry,
  overview: async () => (await apiClient.get<AccountantOverviewSummary>("/ledger/overview")).data,
};

export const uploadApi = {
  uploadProof: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<{ key: string; stored: boolean }>("/uploads/proof", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },
};

export const notificationApi = {
  list: async () =>
    (await apiClient.get<{ notifications: AppNotification[]; unreadCount: number }>("/notifications")).data,
  markRead: async (id: string) =>
    (await apiClient.patch<{ notification: AppNotification }>(`/notifications/${id}/read`)).data.notification,
  markAllRead: async () => apiClient.patch("/notifications/read-all"),
};

export const overviewApi = {
  admin: async (range: "daily" | "weekly" | "monthly" | "yearly") =>
    (await apiClient.get<AdminOverviewData>("/overview/admin", { params: { range } })).data,
  coAdmin: async () => (await apiClient.get<CoAdminOverviewData>("/overview/co-admin")).data,
};

export const auditLogApi = {
  list: async () => (await apiClient.get<{ logs: AuditLog[] }>("/audit-logs")).data.logs,
};

async function downloadBlob(url: string, filename: string) {
  const response = await apiClient.get(url, { responseType: "blob" });
  const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
