const { PERMISSIONS } = require("../config/permissions");

function buildLeadVisibilityWhere(user, teamMemberIds = []) {
  const base = { organizationId: user.organizationId, isDeleted: false };

  if (user.permissions.has(PERMISSIONS.LEAD_VIEW_ALL)) {
    return base;
  }

  if (user.permissions.has(PERMISSIONS.LEAD_VIEW_SCOPED)) {
    return {
      ...base,
      OR: [
        { currentAssigneeId: { in: [user.id, ...teamMemberIds] } },
        { createdById: user.id },
      ],
    };
  }

  if (user.permissions.has(PERMISSIONS.LEAD_VIEW_ASSIGNED)) {
    return { ...base, currentAssigneeId: user.id };
  }

  return { ...base, id: "__no_access__" };
}

function applyLeadVisibilityScope(user, searchFilter = {}, teamMemberIds = []) {
  const visibility = buildLeadVisibilityWhere(user, teamMemberIds);
  if (!searchFilter || Object.keys(searchFilter).length === 0) {
    return visibility;
  }

  return { AND: [visibility, searchFilter] };
}

function canViewLead(user, lead, teamMemberIds = []) {
  if (user.permissions.has(PERMISSIONS.LEAD_VIEW_ALL)) return true;

  if (user.permissions.has(PERMISSIONS.LEAD_VIEW_SCOPED)) {
    return (
      lead.organizationId === user.organizationId &&
      !lead.isDeleted &&
      (lead.currentAssigneeId === user.id ||
        teamMemberIds.includes(lead.currentAssigneeId) ||
        lead.createdById === user.id)
    );
  }

  if (user.permissions.has(PERMISSIONS.LEAD_VIEW_ASSIGNED)) {
    return lead.currentAssigneeId === user.id;
  }

  return false;
}

function canEditLead(user, lead, teamMemberIds = []) {
  if (user.permissions.has(PERMISSIONS.LEAD_EDIT_ALL)) return true;
  if (
    user.permissions.has(PERMISSIONS.LEAD_EDIT_SCOPED) &&
    (lead.createdById === user.id ||
      teamMemberIds.includes(lead.currentAssigneeId) ||
      lead.currentAssigneeId === user.id)
  ) {
    return true;
  }
  if (
    user.permissions.has(PERMISSIONS.LEAD_EDIT_ASSIGNED) &&
    lead.currentAssigneeId === user.id
  ) {
    return true;
  }
  return false;
}

function canAssignLead(actor, targetUser, teamMemberIds = []) {
  if (!targetUser || !targetUser.isActive || targetUser.organizationId !== actor.organizationId) {
    return false;
  }

  // Database rows carry the role as `role.key` (users has no roleKey column);
  // plain objects built elsewhere may carry `roleKey`. Accept either.
  const targetRoleKey = targetUser.roleKey || targetUser.role?.key;

  if (actor.permissions.has(PERMISSIONS.LEAD_ASSIGN) || actor.permissions.has(PERMISSIONS.LEAD_REASSIGN)) {
    if (actor.roleKey === "ADMIN") {
      return targetRoleKey === "MANAGER" || targetRoleKey === "EXECUTIVE";
    }

    if (actor.roleKey === "MANAGER") {
      return (
        targetUser.id === actor.id ||
        (targetRoleKey === "EXECUTIVE" &&
          targetUser.managerId === actor.id &&
          teamMemberIds.includes(targetUser.id))
      );
    }
  }

  return false;
}

module.exports = {
  buildLeadVisibilityWhere,
  applyLeadVisibilityScope,
  canViewLead,
  canEditLead,
  canAssignLead,
};
