const prisma = require("../config/prisma");
const { PERMISSIONS } = require("../config/permissions");
const { ApiError } = require("../utils/http");
const { getLeadForUser, getTeamMemberIds } = require("./lead.service");

function canManageFollowUp(user, lead, teamMemberIds = []) {
  if (!lead || lead.organizationId !== user.organizationId || lead.isDeleted) return false;

  if (user.permissions.has(PERMISSIONS.FOLLOWUP_MANAGE_ALL)) {
    return true;
  }

  if (user.permissions.has(PERMISSIONS.FOLLOWUP_MANAGE_ASSIGNED)) {
    return lead.currentAssigneeId === user.id || lead.createdById === user.id || teamMemberIds.includes(lead.currentAssigneeId);
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
  const lead = await getLeadForUser(user, leadId);
  const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];

  if (!canManageFollowUp(user, lead, teamMemberIds)) {
    throw new ApiError(403, "You do not have permission to view follow-ups for this lead.");
  }

  return prisma.followUp.findMany({
    where: { leadId },
    orderBy: { dueAt: "asc" },
    include: { owner: { select: { id: true, fullName: true } } },
  });
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

/**
 * The `where` fragment for follow-ups a user may see on dashboards. Breadth of
 * visibility follows LEAD visibility (not follow-up *management* rights, which
 * Managers hold org-wide in the permission table but can only exercise on
 * leads inside their scope):
 *
 *   - LEAD_VIEW_ALL (Admin)        -> every follow-up in the organization.
 *   - anyone else (Manager, Exec)  -> follow-ups they own, plus their direct
 *                                     reports' (Managers only; Executives pass
 *                                     no team ids).
 *
 * Every branch filters through `lead.organizationId`, so this can never leak
 * another organization's data, even for the org-wide Admin case.
 */
function buildFollowUpScopeWhere(user, teamMemberIds = []) {
  const where = {
    lead: { organizationId: user.organizationId, isDeleted: false },
  };

  if (!user.permissions.has(PERMISSIONS.LEAD_VIEW_ALL)) {
    where.ownerId = { in: [user.id, ...teamMemberIds] };
  }

  return where;
}

const FOLLOWUP_INCLUDE = {
  lead: { select: { id: true, leadCode: true, clientName: true } },
  owner: { select: { id: true, fullName: true } },
};

/** Pending follow-ups whose due time has passed, within the user's scope. */
async function listOverdueFollowUps(user, teamMemberIds = []) {
  return prisma.followUp.findMany({
    where: {
      ...buildFollowUpScopeWhere(user, teamMemberIds),
      status: "PENDING",
      dueAt: { lt: new Date() },
    },
    orderBy: { dueAt: "asc" },
    include: FOLLOWUP_INCLUDE,
  });
}

/** Next pending follow-ups that are not yet overdue, within the user's scope. */
async function listUpcomingFollowUps(user, teamMemberIds = [], take = 5) {
  return prisma.followUp.findMany({
    where: {
      ...buildFollowUpScopeWhere(user, teamMemberIds),
      status: "PENDING",
      dueAt: { gte: new Date() },
    },
    orderBy: { dueAt: "asc" },
    take,
    include: FOLLOWUP_INCLUDE,
  });
}

/** Count of pending follow-ups due between `from` and `to` (used for "due today"). */
async function countFollowUpsDueBetween(user, teamMemberIds, from, to) {
  return prisma.followUp.count({
    where: {
      ...buildFollowUpScopeWhere(user, teamMemberIds),
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
