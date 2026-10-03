// ============================================================================
// Permission keys — the single source of truth for what a permission string
// means. RBAC is *permission-driven*: routes/services check "does this
// user's role have permission X" rather than "if (role === 'MANAGER')".
// This lets us add future roles (Executive L1/L2/L3) purely as data — new
// rows in Role + RolePermission — with zero code changes here.
// ============================================================================

const PERMISSIONS = {
  LEAD_VIEW_ALL: "lead.view_all", // bypasses scope — Admin
  LEAD_VIEW_SCOPED: "lead.view_scoped", // Manager: own + team leads
  LEAD_VIEW_ASSIGNED: "lead.view_assigned", // Executive: leads assigned to them
  LEAD_CREATE: "lead.create",
  LEAD_EDIT_ALL: "lead.edit_all",
  LEAD_EDIT_SCOPED: "lead.edit_scoped",
  LEAD_EDIT_ASSIGNED: "lead.edit_assigned",
  LEAD_ASSIGN: "lead.assign",
  LEAD_REASSIGN: "lead.reassign",
  LEAD_CHANGE_STATUS: "lead.change_status",
  LEAD_CHANGE_PRIORITY: "lead.change_priority",
  LEAD_DELETE: "lead.delete",
  LEAD_ADD_NOTE: "lead.add_note",
  FOLLOWUP_MANAGE_ALL: "followup.manage_all",
  FOLLOWUP_MANAGE_ASSIGNED: "followup.manage_assigned",
  HISTORY_VIEW_ALL: "history.view_all",
  HISTORY_VIEW_SCOPED: "history.view_scoped",
  HISTORY_VIEW_ASSIGNED: "history.view_assigned",
  EXPORT_DATA: "export.data",
  REPORTS_VIEW: "reports.view",
  USER_MANAGE: "user.manage",
  ROLE_MANAGE: "role.manage",
};

// Default role → permission wiring used by the seed script. This is *data*,
// not logic — an Admin can later edit RolePermission rows in the DB (or via
// a future admin UI) without touching this file.
const DEFAULT_ROLE_PERMISSIONS = {
  ADMIN: Object.values(PERMISSIONS), // Admin has everything
  MANAGER: [
    PERMISSIONS.LEAD_VIEW_SCOPED,
    PERMISSIONS.LEAD_VIEW_ASSIGNED,
    PERMISSIONS.LEAD_CREATE,
    PERMISSIONS.LEAD_EDIT_SCOPED,
    PERMISSIONS.LEAD_ASSIGN,
    PERMISSIONS.LEAD_REASSIGN,
    PERMISSIONS.LEAD_CHANGE_STATUS,
    PERMISSIONS.LEAD_CHANGE_PRIORITY,
    PERMISSIONS.LEAD_ADD_NOTE,
    PERMISSIONS.FOLLOWUP_MANAGE_ALL,
    PERMISSIONS.HISTORY_VIEW_SCOPED,
    PERMISSIONS.EXPORT_DATA,
    PERMISSIONS.REPORTS_VIEW,
  ],
  EXECUTIVE: [
    PERMISSIONS.LEAD_VIEW_ASSIGNED,
    PERMISSIONS.LEAD_EDIT_ASSIGNED,
    PERMISSIONS.LEAD_CHANGE_STATUS,
    PERMISSIONS.LEAD_CHANGE_PRIORITY,
    PERMISSIONS.LEAD_ADD_NOTE,
    PERMISSIONS.FOLLOWUP_MANAGE_ASSIGNED,
    PERMISSIONS.HISTORY_VIEW_ASSIGNED,
  ],
};

module.exports = { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS };
