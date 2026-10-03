import { useSelector } from "react-redux";
import { selectCurrentUser } from "../features/auth/authSlice";

/**
 * `const canCreateLead = usePermission(PERMISSIONS.LEAD_CREATE);`
 *
 * Frontend permission checks are a UX convenience only (hide buttons the
 * user can't use) — the backend independently re-checks every request, so
 * there is no risk in this being purely client-side state.
 */
export function usePermission(...anyOfPermissionKeys) {
  const user = useSelector(selectCurrentUser);
  if (!user) return false;
  return anyOfPermissionKeys.some((key) => user.permissions.includes(key));
}

export default usePermission;
