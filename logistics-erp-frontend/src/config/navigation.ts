import type { Scope } from "../types/roles";

export interface NavItem {
  label: string;
  path: string;
}

// Per-scope navigation, built out page-by-page across phases.
export const NAV_BY_SCOPE: Record<Scope, NavItem[]> = {
  admin: [
    { label: "Overview", path: "/" },
    { label: "Vehicle Status", path: "/admin/vehicle-status" },
    { label: "Vehicle Assign", path: "/admin/vehicle-assign" },
    { label: "LR Approval", path: "/admin/lr-approval" },
    { label: "Lorry Receipt", path: "/admin/lorry-receipts" },
    { label: "Loading Slips", path: "/admin/loading-slips" },
    { label: "GR", path: "/admin/goods-receipts" },
    { label: "Create Trip", path: "/admin/create-trip" },
    { label: "Temporary Trip", path: "/admin/create-temporary-trip" },
    { label: "Trip Sheet", path: "/admin/trip-sheet" },
    { label: "Drivers", path: "/admin/drivers" },
    { label: "Clients", path: "/admin/clients" },
    { label: "Inventory", path: "/admin/inventory" },
    { label: "Inventory Requests", path: "/admin/inventory-requests" },
    { label: "Employees", path: "/admin/employees" },
    { label: "Roles & Access", path: "/admin/roles-access" },
    { label: "Payment Logs", path: "/admin/payment-logs" },
    { label: "Audit Log", path: "/admin/audit-log" },
  ],
  co_admin: [
    { label: "Overview", path: "/" },
    { label: "Vehicle Status", path: "/admin/vehicle-status" },
    { label: "Vehicle Assign", path: "/admin/vehicle-assign" },
    { label: "LR Approval", path: "/admin/lr-approval" },
    { label: "Loading Slips", path: "/admin/loading-slips" },
    { label: "Create Trip", path: "/admin/create-trip" },
    { label: "Temporary Trip", path: "/admin/create-temporary-trip" },
    { label: "Trip Sheet", path: "/admin/trip-sheet" },
    { label: "Drivers", path: "/admin/drivers" },
    { label: "Clients", path: "/admin/clients" },
    { label: "Inventory", path: "/admin/inventory" },
    { label: "Inventory Requests", path: "/admin/inventory-requests" },
    { label: "Employees", path: "/admin/employees" },
    { label: "Roles & Access", path: "/admin/roles-access" },
  ],
  vehicle_master: [
    { label: "Overview", path: "/" },
    { label: "Vehicle Maintenance", path: "/vehicle-master/maintenance" },
    { label: "Drivers", path: "/vehicle-master/drivers" },
    { label: "Approvement", path: "/vehicle-master/approvement" },
    { label: "Record Trips", path: "/vehicle-master/trips" },
  ],
  entry_master: [
    { label: "Overview", path: "/" },
    { label: "Vehicles", path: "/entry-master/vehicles" },
    { label: "Drivers", path: "/entry-master/drivers" },
    { label: "Clients", path: "/entry-master/clients" },
    { label: "Employees", path: "/entry-master/employees" },
    { label: "Inventory", path: "/entry-master/inventory" },
    { label: "Inventory Requests", path: "/entry-master/inventory-requests" },
  ],
  accountant: [
    { label: "Overview", path: "/" },
    { label: "Cashbook", path: "/accountant/cashbook" },
    { label: "Cashless Book", path: "/accountant/cashless-book" },
    { label: "Requests", path: "/accountant/requests" },
    { label: "Loading Slip Verification", path: "/accountant/loading-slips" },
    { label: "Trip Closing Payments", path: "/accountant/trip-closures" },
    { label: "Inventory Payments", path: "/accountant/inventory-payments" },
  ],
  client: [
    { label: "Overview", path: "/" },
    { label: "Reserve LR", path: "/client/reserve-lr" },
    { label: "Lorry Receipts", path: "/client/lorry-receipts" },
    { label: "Loading Slips", path: "/client/loading-slips" },
  ],
  driver: [
    { label: "Overview", path: "/" },
    { label: "Payment Requests", path: "/driver/payments" },
    { label: "Vehicle Status", path: "/driver/vehicle-status" },
  ],
};
