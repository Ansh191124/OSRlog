import { Navigate, Outlet } from "react-router-dom";
import { useApp } from "../context/AppContext";
import type { Scope } from "../types/roles";

export function ProtectedRoute({ allow }: { allow?: Scope[] }) {
  const { isAuthenticated, isLoading, scope } = useApp();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allow && scope && !allow.includes(scope)) return <Navigate to="/" replace />;

  return <Outlet />;
}
