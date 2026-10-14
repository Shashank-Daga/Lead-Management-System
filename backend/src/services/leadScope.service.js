const { PERMISSIONS } = require("../config/permissions");

function buildLeadVisibilityWhere(user, teamMemberIds = []) {
  const base = { isDeleted: false };

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
  if (lead.isDeleted) return false;

  if (user.permissions.has(PERMISSIONS.LEAD_VIEW_ALL)) return true;

  if (user.permissions.has(PERMISSIONS.LEAD_VIEW_SCOPED)) {
    return (
      lead.currentAssigneeId === user.id ||
      teamMemberIds.includes(lead.currentAssigneeId) ||
      lead.createdById === user.id
    );
  }

  if (user.permissions.has(PERMISSIONS.LEAD_VIEW_ASSIGNED)) {
    return lead.currentAssigneeId === user.id;
  }

  return false;
}

/** Lead is the manager's own, a direct report's, or an unassigned lead they created. */
function isInManagerScope(user, lead, teamMemberIds = []) {
  if (lead.currentAssigneeId) {
    return lead.currentAssigneeId === user.id || teamMemberIds.includes(lead.currentAssigneeId);
  }
  return lead.createdById === user.id;
}

function canEditLead(user, lead, teamMemberIds = []) {
  if (lead.isDeleted) return false;

  if (user.permissions.has(PERMISSIONS.LEAD_EDIT_ALL)) return true;

  // A Manager works leads that are CURRENTLY theirs or their team's. Having
  // created a lead only counts while it is still unassigned; once it belongs to
  // someone outside the team, the creator can still view it but not change it.
  if (
    user.permissions.has(PERMISSIONS.LEAD_EDIT_SCOPED) &&
    isInManagerScope(user, lead, teamMemberIds)
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

/**
 * May this actor change who the lead is assigned to? (Separate from whether the
 * TARGET is a valid assignee, see canAssignLead.) Admins: any lead. Managers:
 * only leads currently in their own scope.
 */
function canReassignLead(actor, lead, teamMemberIds = []) {
  if (lead.isDeleted) return false;
  if (actor.roleKey === "ADMIN") return true;
  if (actor.roleKey === "MANAGER") return isInManagerScope(actor, lead, teamMemberIds);
  return false;
}

function canAssignLead(actor, targetUser, teamMemberIds = []) {
  if (!targetUser || !targetUser.isActive) {
    return false;
  }

  const targetRoleKey = targetUser.roleKey || targetUser.role?.key;

  if (
    actor.permissions.has(PERMISSIONS.LEAD_ASSIGN) ||
    actor.permissions.has(PERMISSIONS.LEAD_REASSIGN)
  ) {
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
  canReassignLead,
  isInManagerScope,
};
