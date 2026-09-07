import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "./context/AppContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Login } from "./pages/Login";
import { Overview } from "./pages/Overview";
import { VehiclesPage } from "./pages/entry-master/VehiclesPage";
import { DriversPage } from "./pages/entry-master/DriversPage";
import { ClientsPage } from "./pages/entry-master/ClientsPage";
import { EmployeesPage } from "./pages/entry-master/EmployeesPage";
import { InventoryRequestsPage } from "./pages/entry-master/InventoryRequestsPage";
import { RolesAccessPage } from "./pages/admin/RolesAccessPage";
import { VehicleStatusPage } from "./pages/admin/VehicleStatusPage";
import { VehicleAssignPage } from "./pages/admin/VehicleAssignPage";
import { DriversOverviewPage } from "./pages/admin/DriversOverviewPage";
import { InventoryPage } from "./pages/admin/InventoryPage";
import { LRApprovalPage } from "./pages/admin/LRApprovalPage";
import { AllLorryReceiptsPage } from "./pages/admin/AllLorryReceiptsPage";
import { GoodsReceiptsPage } from "./pages/admin/GoodsReceiptsPage";
import { LoadingSlipsPage } from "./pages/admin/LoadingSlipsPage";
import { CreateLoadingSlipPage } from "./pages/admin/CreateLoadingSlipPage";
import { CreateTripPage } from "./pages/admin/CreateTripPage";
import { CreateTemporaryTripPage } from "./pages/admin/CreateTemporaryTripPage";
import { TripSheetPage } from "./pages/admin/TripSheetPage";
import { PaymentLogsPage } from "./pages/admin/PaymentLogsPage";
import { AuditLogPage } from "./pages/admin/AuditLogPage";
import { MaintenancePage } from "./pages/vehicle-master/MaintenancePage";
import { MyDriversPage } from "./pages/vehicle-master/MyDriversPage";
import { RecordTripsPage } from "./pages/vehicle-master/RecordTripsPage";
import { ApprovementPage } from "./pages/vehicle-master/ApprovementPage";
import { ReserveLRPage } from "./pages/client/ReserveLRPage";
import { LorryReceiptsPage } from "./pages/client/LorryReceiptsPage";
import { LoadingSlipsPage as ClientLoadingSlipsPage } from "./pages/client/LoadingSlipsPage";
import { LoadingSlipReviewPage } from "./pages/client/LoadingSlipReviewPage";
import { DriverPaymentsPage } from "./pages/driver/DriverPaymentsPage";
import { DriverVehicleStatusPage } from "./pages/driver/DriverVehicleStatusPage";
import { CashbookPage } from "./pages/accountant/CashbookPage";
import { CashlessBookPage } from "./pages/accountant/CashlessBookPage";
import { AccountantRequestsPage } from "./pages/accountant/AccountantRequestsPage";
import { LoadingSlipVerificationPage } from "./pages/accountant/LoadingSlipVerificationPage";
import { TripClosingVerificationPage } from "./pages/accountant/TripClosingVerificationPage";
import { InventoryPaymentsPage } from "./pages/accountant/InventoryPaymentsPage";
import { VehicleDetailPage } from "./pages/details/VehicleDetailPage";
import { DriverDetailPage, ClientDetailPage, EmployeeDetailPage } from "./pages/details/PersonDetailPage";
import { LorryReceiptDetailPage } from "./pages/details/LorryReceiptDetailPage";
import { GoodsReceiptDetailPage } from "./pages/details/GoodsReceiptDetailPage";
import { TripDetailPage } from "./pages/details/TripDetailPage";
import { PaymentDetailPage } from "./pages/details/PaymentDetailPage";
import { InventoryDetailPage } from "./pages/details/InventoryDetailPage";
import { MaintenanceDetailPage } from "./pages/details/MaintenanceDetailPage";
import { ReservationDetailPage } from "./pages/details/ReservationDetailPage";
import { LoadingSlipDetailPage } from "./pages/details/LoadingSlipDetailPage";

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Overview />} />

              <Route path="/vehicles/:id" element={<VehicleDetailPage />} />
              <Route path="/drivers/:id" element={<DriverDetailPage />} />
              <Route path="/clients/:id" element={<ClientDetailPage />} />
              <Route path="/employees/:id" element={<EmployeeDetailPage />} />
              <Route path="/lorry-receipts/:id" element={<LorryReceiptDetailPage />} />
              <Route path="/goods-receipts/:id" element={<GoodsReceiptDetailPage />} />
              <Route path="/trips/:id" element={<TripDetailPage />} />
              <Route path="/payments/:id" element={<PaymentDetailPage />} />
              <Route path="/inventory/:id" element={<InventoryDetailPage />} />
              <Route path="/maintenance/:id" element={<MaintenanceDetailPage />} />
              <Route path="/reservations/:id" element={<ReservationDetailPage />} />
              <Route path="/loading-slips/:id" element={<LoadingSlipDetailPage />} />

              <Route element={<ProtectedRoute allow={["entry_master"]} />}>
                <Route path="/entry-master/vehicles" element={<VehiclesPage />} />
                <Route path="/entry-master/drivers" element={<DriversPage />} />
                <Route path="/entry-master/clients" element={<ClientsPage />} />
                <Route path="/entry-master/employees" element={<EmployeesPage />} />
                <Route path="/entry-master/inventory" element={<InventoryPage />} />
                <Route path="/entry-master/inventory-requests" element={<InventoryRequestsPage />} />
              </Route>

              <Route element={<ProtectedRoute allow={["admin", "co_admin"]} />}>
                <Route path="/admin/employees" element={<EmployeesPage />} />
                <Route path="/admin/roles-access" element={<RolesAccessPage />} />
                <Route path="/admin/vehicle-status" element={<VehicleStatusPage />} />
                <Route path="/admin/vehicle-assign" element={<VehicleAssignPage />} />
                <Route path="/admin/drivers" element={<DriversOverviewPage />} />
                <Route path="/admin/clients" element={<ClientsPage />} />
                <Route path="/admin/inventory" element={<InventoryPage />} />
                <Route path="/admin/inventory-requests" element={<InventoryRequestsPage />} />
                <Route path="/admin/lr-approval" element={<LRApprovalPage />} />
                <Route path="/admin/loading-slips" element={<LoadingSlipsPage />} />
                <Route path="/admin/loading-slips/new" element={<CreateLoadingSlipPage />} />
                <Route path="/admin/create-trip" element={<CreateTripPage />} />
                <Route path="/admin/create-temporary-trip" element={<CreateTemporaryTripPage />} />
                <Route path="/admin/trip-sheet" element={<TripSheetPage />} />
              </Route>

              <Route element={<ProtectedRoute allow={["admin"]} />}>
                <Route path="/admin/lorry-receipts" element={<AllLorryReceiptsPage />} />
                <Route path="/admin/goods-receipts" element={<GoodsReceiptsPage />} />
                <Route path="/admin/payment-logs" element={<PaymentLogsPage />} />
                <Route path="/admin/audit-log" element={<AuditLogPage />} />
              </Route>

              <Route element={<ProtectedRoute allow={["vehicle_master"]} />}>
                <Route path="/vehicle-master/maintenance" element={<MaintenancePage />} />
                <Route path="/vehicle-master/drivers" element={<MyDriversPage />} />
                <Route path="/vehicle-master/trips" element={<RecordTripsPage />} />
                <Route path="/vehicle-master/approvement" element={<ApprovementPage />} />
              </Route>

              <Route element={<ProtectedRoute allow={["client"]} />}>
                <Route path="/client/reserve-lr" element={<ReserveLRPage />} />
                <Route path="/client/lorry-receipts" element={<LorryReceiptsPage />} />
                <Route path="/client/loading-slips" element={<ClientLoadingSlipsPage />} />
                <Route path="/client/loading-slips/:id" element={<LoadingSlipReviewPage />} />
              </Route>

              <Route element={<ProtectedRoute allow={["driver"]} />}>
                <Route path="/driver/payments" element={<DriverPaymentsPage />} />
                <Route path="/driver/vehicle-status" element={<DriverVehicleStatusPage />} />
              </Route>

              <Route element={<ProtectedRoute allow={["accountant"]} />}>
                <Route path="/accountant/cashbook" element={<CashbookPage />} />
                <Route path="/accountant/cashless-book" element={<CashlessBookPage />} />
                <Route path="/accountant/requests" element={<AccountantRequestsPage />} />
                <Route path="/accountant/loading-slips" element={<LoadingSlipVerificationPage />} />
                <Route path="/accountant/trip-closures" element={<TripClosingVerificationPage />} />
                <Route path="/accountant/inventory-payments" element={<InventoryPaymentsPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
