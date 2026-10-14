const prisma = require("../config/prisma");
const { PERMISSIONS } = require("../config/permissions");
const { ApiError } = require("../utils/http");
const { getLeadForUser, getTeamMemberIds } = require("./lead.service");
const { isInManagerScope } = require("./leadScope.service");

function canManageFollowUp(user, lead, teamMemberIds = []) {
  if (!lead || lead.isDeleted) return false;

  if (user.permissions.has(PERMISSIONS.FOLLOWUP_MANAGE_ALL)) {
    // Admin: every lead. Manager: only leads currently in their scope (a lead they merely created and that moved to another team
    // is view-only).
    return (
      user.permissions.has(PERMISSIONS.LEAD_VIEW_ALL) ||
      isInManagerScope(user, lead, teamMemberIds)
    );
  }

  if (user.permissions.has(PERMISSIONS.FOLLOWUP_MANAGE_ASSIGNED)) {
    // Creator only counts while the lead is unassigned (see canEditLead).
    return lead.currentAssigneeId
      ? lead.currentAssigneeId === user.id || teamMemberIds.includes(lead.currentAssigneeId)
      : lead.createdById === user.id;
  }

  return false;
}

function resolveFollowUpCompletionData(currentStatus, nextStatus, previousCompletedAt) {
  if (nextStatus === "COMPLETED") return { status: nextStatus, completedAt: new Date() };
  if (nextStatus === "PENDING" || nextStatus === "CANCELLED") {
    return { status: nextStatus, completedAt: null };
  }

  return { status: nextStatus, completedAt: previousCompletedAt };
}

/** Keeps Lead.nextFollowUpDate in sync so list queries can sort/filter fast. */
async function syncLeadNextFollowUp(tx, leadId) {
  const next = await tx.followUp.findFirst({
    where: { leadId, status: "PENDING" },
    orderBy: { dueAt: "asc" },
  });
  await tx.lead.update({
    where: { id: leadId },
    data: { nextFollowUpDate: next ? next.dueAt : null },
  });
}

async function createFollowUp(user, leadId, { dueAt, notes }) {
  const lead = await getLeadForUser(user, leadId);
  const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];

  if (!canManageFollowUp(user, lead, teamMemberIds)) {
    throw new ApiError(403, "You do not have permission to manage follow-ups for this lead.");
  }

  return prisma.$transaction(async (tx) => {
    const followUp = await tx.followUp.create({
      data: { leadId, ownerId: user.id, dueAt: new Date(dueAt), notes },
    });
    await syncLeadNextFollowUp(tx, leadId);
    return followUp;
  });
}

async function updateFollowUp(user, leadId, followUpId, input) {
  const lead = await getLeadForUser(user, leadId);
  const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];

  const followUp = await prisma.followUp.findFirst({ where: { id: followUpId, leadId } });
  if (!followUp) throw new ApiError(404, "Follow-up not found.");

  const isOwner = followUp.ownerId === user.id;
  const isAuthorizedManager = user.permissions.has(PERMISSIONS.FOLLOWUP_MANAGE_ALL) && canManageFollowUp(user, lead, teamMemberIds);
  const isAssignedManager = user.permissions.has(PERMISSIONS.FOLLOWUP_MANAGE_ASSIGNED) && canManageFollowUp(user, lead, teamMemberIds);

  if (!isOwner && !isAuthorizedManager && !isAssignedManager) {
    throw new ApiError(403, "You do not have permission to update this follow-up.");
  }

  return prisma.$transaction(async (tx) => {
    const nextStatus = input.status ?? followUp.status;
    const completionState = resolveFollowUpCompletionData(followUp.status, nextStatus, followUp.completedAt);

    const updated = await tx.followUp.update({
      where: { id: followUpId },
      data: {
        dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
        notes: input.notes,
        status: completionState.status,
        completedAt: completionState.completedAt,
      },
    });

    if (input.status) {
      await tx.lead.update({
        where: { id: leadId },
        data: {
          lastContactDate: input.status === "COMPLETED" ? new Date() : undefined,
        },
      });
    }

    await syncLeadNextFollowUp(tx, leadId);
    return updated;
  });
}

async function listFollowUps(user, leadId) {
  await getLeadForUser(user, leadId);
  const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];

  // Reading needs no separate gate: getLeadForUser already enforced lead visibility, and the `where` below only returns 
  // follow-ups in the user's scope (so a creator-manager of a handed-off lead just gets an empty list).

  // Same ownership/hierarchy rule as the dashboards, so the lead tab can never reveal a follow-up the dashboards would hide 
  // (e.g. another team's).
  const followUps = await prisma.followUp.findMany({
    where: { leadId, ...buildFollowUpScopeWhere(user, teamMemberIds) },
    orderBy: { dueAt: "asc" },
    include: {
      owner: { select: { id: true, fullName: true } },
      lead: { select: { currentAssignee: { select: { id: true, fullName: true } } } },
    },
  });

  return followUps.map(({ lead: leadInfo, ...followUp }) => ({
    ...followUp,
    owner: leadInfo?.currentAssignee ?? followUp.owner,
  }));
}

async function deleteFollowUp(user, leadId, followUpId) {
  const lead = await getLeadForUser(user, leadId);
  const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];

  const followUp = await prisma.followUp.findFirst({ where: { id: followUpId, leadId } });
  if (!followUp) throw new ApiError(404, "Follow-up not found.");

  const isOwner = followUp.ownerId === user.id;
  const isAuthorized = canManageFollowUp(user, lead, teamMemberIds) || isOwner;
  if (!isAuthorized) {
    throw new ApiError(403, "You do not have permission to delete this follow-up.");
  }

  return prisma.$transaction(async (tx) => {
    await tx.followUp.delete({ where: { id: followUpId } });
    await syncLeadNextFollowUp(tx, leadId);
  });
}

/*
 * The `where` fragment for follow-ups a user may see. Visibility depends on who the follow-up CURRENTLY belongs to, never on who 
 * created it:
 *
 *   A follow-up belongs to the current assignee of its lead. (`ownerId` records who created it; it only decides ownership while 
 *   the lead is unassigned.) Because this is read from the lead at query time, reassigning a lead moves its follow-ups' 
 *   visibility immediately, including follow-ups created earlier by an Admin.
 *
 *   - LEAD_VIEW_ALL (Admin)  -> every follow-up on a non-deleted lead.
 *   - Manager                -> follow-ups on leads assigned to the manager or
 *                               to one of the manager's active direct reports.
 *   - Executive              -> follow-ups on leads assigned to the executive.
 *
 * Overdue / upcoming status is applied by the callers and never widens access.
 * The application serves one organization, so access control is enforced
 * entirely through RBAC and team ownership rather than organization filters.
 */

function buildFollowUpScopeWhere(user, teamMemberIds = []) {
  const where = {
    lead: { isDeleted: false },
  };

  if (user.permissions.has(PERMISSIONS.LEAD_VIEW_ALL)) {
    return where;
  }

  const scopeIds = [user.id, ...teamMemberIds];

  // Not `where.lead.OR`: the unassigned-lead branch also needs `ownerId`.
  where.OR = [
    { lead: { isDeleted: false, currentAssigneeId: { in: scopeIds } } },
    { ownerId: { in: scopeIds }, lead: { isDeleted: false, currentAssigneeId: null } },
  ];

  return where;
}

// Closed-out leads: nothing is left to chase.
const CLOSED_LEAD_STATUSES = ["LOST", "CONVERTED"];

/**
 * Dashboard follow-up widgets (overdue / upcoming / due today) ignore leads that are LOST or CONVERTED. The lead's own follow-up
 * tab still lists them, since it uses buildFollowUpScopeWhere directly.
 */
function buildDashboardFollowUpWhere(user, teamMemberIds = []) {
  return {
    AND: [buildFollowUpScopeWhere(user, teamMemberIds), { lead: { status: { notIn: CLOSED_LEAD_STATUSES } } }],
  };
}

const FOLLOWUP_INCLUDE = {
  lead: {
    select: {
      id: true,
      leadCode: true,
      clientName: true,
      currentAssignee: { select: { id: true, fullName: true } },
    },
  },
  owner: { select: { id: true, fullName: true } },
};

/**
 * API shape: `owner` is the follow-up's current owner (the lead's assignee), falling back to the creator while the lead is
 * unassigned.
 */
function withCurrentOwner({ lead, ...followUp }) {
  const { currentAssignee, ...leadInfo } = lead;
  return { ...followUp, lead: leadInfo, owner: currentAssignee ?? followUp.owner };
}

/** Pending follow-ups whose due time has passed, within the user's scope. */
async function listOverdueFollowUps(user, teamMemberIds = []) {
  const rows = await prisma.followUp.findMany({
    where: {
      ...buildDashboardFollowUpWhere(user, teamMemberIds),
      status: "PENDING",
      dueAt: { lt: new Date() },
    },
    orderBy: { dueAt: "asc" },
    include: FOLLOWUP_INCLUDE,
  });
  return rows.map(withCurrentOwner);
}

/** Next pending follow-ups that are not yet overdue, within the user's scope. */
async function listUpcomingFollowUps(user, teamMemberIds = [], take = 5) {
  const rows = await prisma.followUp.findMany({
    where: {
      ...buildDashboardFollowUpWhere(user, teamMemberIds),
      status: "PENDING",
      dueAt: { gte: new Date() },
    },
    orderBy: { dueAt: "asc" },
    take,
    include: FOLLOWUP_INCLUDE,
  });
  return rows.map(withCurrentOwner);
}

/** Count of pending follow-ups due between `from` and `to` (used for "due today"). */
async function countFollowUpsDueBetween(user, teamMemberIds, from, to) {
  return prisma.followUp.count({
    where: {
      ...buildDashboardFollowUpWhere(user, teamMemberIds),
      status: "PENDING",
      dueAt: { gte: from, lte: to },
    },
  });
}

module.exports = {
  buildFollowUpScopeWhere,
  listUpcomingFollowUps,
  countFollowUpsDueBetween,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  listFollowUps,
  listOverdueFollowUps,
  canManageFollowUp,
  resolveFollowUpCompletionData,
};
