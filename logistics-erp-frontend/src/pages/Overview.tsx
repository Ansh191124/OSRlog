import { useApp } from "../context/AppContext";
import { EntryMasterOverview } from "./entry-master/EntryMasterOverview";
import { VehicleMasterOverview } from "./vehicle-master/VehicleMasterOverview";
import { ClientOverview } from "./client/ClientOverview";
import { DriverOverview } from "./driver/DriverOverview";
import { AccountantOverview } from "./accountant/AccountantOverview";
import { AdminOverviewPage } from "./admin/AdminOverviewPage";
import { CoAdminOverviewPage } from "./admin/CoAdminOverviewPage";

// Dispatches "/" to the real per-role Overview.
export function Overview() {
  const { scope } = useApp();

  if (scope === "entry_master") return <EntryMasterOverview />;
  if (scope === "vehicle_master") return <VehicleMasterOverview />;
  if (scope === "client") return <ClientOverview />;
  if (scope === "driver") return <DriverOverview />;
  if (scope === "accountant") return <AccountantOverview />;
  if (scope === "admin") return <AdminOverviewPage />;
  if (scope === "co_admin") return <CoAdminOverviewPage />;

  return null;
}
