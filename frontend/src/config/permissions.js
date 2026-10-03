// Mirrors backend/src/config/permissions.js. Kept as plain strings (not a
// shared package) to keep this a simple two-folder repo — if this grows into
// a monorepo with a build step, extract both into a shared package instead.
export const PERMISSIONS = {
  LEAD_VIEW_ALL: "lead.view_all",
  LEAD_VIEW_SCOPED: "lead.view_scoped",
  LEAD_VIEW_ASSIGNED: "lead.view_assigned",
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
