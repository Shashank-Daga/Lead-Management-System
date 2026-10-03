import { Navigate, Outlet } from "react-router-dom";
import usePermission from "../hooks/usePermission";

/** Wraps a route subtree so navigating there directly (typed URL) also respects RBAC, not just hidden nav links. */
export default function RequirePermission({ permission }) {
  const allowed = usePermission(permission);
  return allowed ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
