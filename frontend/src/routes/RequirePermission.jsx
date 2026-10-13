import { Navigate, Outlet } from "react-router-dom";
import usePermission from "../hooks/usePermission";

/** `permission` may be one key or an array (any one of them grants access). Wraps a route subtree so navigating there directly (typed URL) also respects RBAC, not just hidden nav links. */
export default function RequirePermission({ permission }) {
  const keys = Array.isArray(permission) ? permission : [permission];
  const allowed = usePermission(...keys);
  return allowed ? <Outlet /> : <Navigate to="/dashboard" replace />;
}
