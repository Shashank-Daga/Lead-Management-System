const prisma = require("../config/prisma");
const { ApiError } = require("../utils/http");
const { nextLeadCode } = require("./leadSequence.service");
const {
  buildLeadVisibilityWhere,
  applyLeadVisibilityScope,
  canViewLead,
  canEditLead,
  canAssignLead,
} = require("./leadScope.service");
const { isValidTransition } = require("../config/statusTransitions");
const { PERMISSIONS } = require("../config/permissions");
const { notifyUser } = require("./notification.service");

async function getTeamMemberIds(managerId) {
  const reports = await prisma.users.findMany({
    where: { managerId, isActive: true },
    select: { id: true },
  });
  return reports.map((r) => r.id);
}

async function recordHistory(tx, { leadId, actorId, eventType, fromValue, toValue, comment }) {
  await tx.leadHistory.create({
    data: { leadId, actorId, eventType, fromValue, toValue, comment },
  });
}

async function getLeadForUser(user, leadId) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId: user.organizationId, isDeleted: false },
    include: {
      currentAssignee: { select: { id: true, fullName: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  if (!lead) throw new ApiError(404, "Lead not found.");

  const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];
  if (!canViewLead(user, lead, teamMemberIds)) {
    throw new ApiError(403, "You do not have access to this lead.");
  }

  return lead;
}

async function getLeadOr404(leadId, organizationId) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId, isDeleted: false },
    include: {
      currentAssignee: { select: { id: true, fullName: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });
  if (!lead) throw new ApiError(404, "Lead not found.");
  return lead;
}

async function createLead(user, input) {
  return prisma.$transaction(async (tx) => {
    let targetUser = null;
    if (input.assignToUserId) {
      targetUser = await tx.users.findFirst({
        where: { id: input.assignToUserId, organizationId: user.organizationId, isActive: true },
        include: { role: { select: { key: true } } },
      });

      const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];
      if (!canAssignLead(user, targetUser, teamMemberIds)) {
        throw new ApiError(403, "You are not allowed to assign a lead to that user.");
      }
    }

    const leadCode = await nextLeadCode(tx);

    const lead = await tx.lead.create({
      data: {
        leadCode,
        organizationId: user.organizationId,
        clientName: input.clientName,
        contactPerson: input.contactPerson,
        email: input.email || null,
        phone: input.phone,
        alternatePhone: input.alternatePhone || null,
        address: input.address || null,
        source: input.source,
        productInterest: input.productInterest || null,
        description: input.description || null,
        priority: input.priority || "MEDIUM",
        tags: input.tags || [],
        createdById: user.id,
        currentAssigneeId: input.assignToUserId || null,
        assignmentDate: input.assignToUserId ? new Date() : null,
      },
    });

    await recordHistory(tx, {
      leadId: lead.id,
      actorId: user.id,
      eventType: "CREATED",
      toValue: lead.status,
    });

    if (input.assignToUserId) {
      await tx.assignmentHistory.create({
        data: {
          leadId: lead.id,
          toUserId: input.assignToUserId,
          assignedById: user.id,
          reason: "Initial assignment at creation",
        },
      });

      await notifyUser(input.assignToUserId, {
        type: "LEAD_ASSIGNED",
        title: "Lead assigned",
        message: `Lead ${lead.leadCode} was assigned to you.`,
        metadata: { leadId: lead.id, leadCode: lead.leadCode },
      }, tx);
    }

    return lead;
  });
}

async function listLeads(user, query) {
  const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];

  const searchFilter = query.search
    ? {
        OR: [
          { clientName: { contains: query.search, mode: "insensitive" } },
          { contactPerson: { contains: query.search, mode: "insensitive" } },
          { phone: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
          { leadCode: { contains: query.search, mode: "insensitive" } },
        ],
      }
    : {};

  const statusFilter = query.status ? { status: { in: query.status.split(",") } } : {};
  const priorityFilter = query.priority ? { priority: { in: query.priority.split(",") } } : {};
  const assigneeFilter = query.assignedTo ? { currentAssigneeId: query.assignedTo } : {};

  const where = applyLeadVisibilityScope(user, {
    ...searchFilter,
    ...statusFilter,
    ...priorityFilter,
    ...assigneeFilter,
  }, teamMemberIds);

  const [total, items] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        currentAssignee: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    }),
  ]);

  return {
    items,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    },
  };
}

async function assertCanEdit(user, lead) {
  const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];
  if (!canEditLead(user, lead, teamMemberIds)) {
    throw new ApiError(403, "You do not have permission to modify this lead.");
  }
}

async function updateLead(user, leadId, input) {
  const lead = await getLeadForUser(user, leadId);
  await assertCanEdit(user, lead);

  const updateData = {
    ...(input.clientName !== undefined ? { clientName: input.clientName } : {}),
    ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson } : {}),
    ...(input.email !== undefined ? { email: input.email === "" ? null : input.email } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.alternatePhone !== undefined ? { alternatePhone: input.alternatePhone || null } : {}),
    ...(input.address !== undefined ? { address: input.address || null } : {}),
    ...(input.source !== undefined ? { source: input.source } : {}),
    ...(input.productInterest !== undefined ? { productInterest: input.productInterest || null } : {}),
    ...(input.description !== undefined ? { description: input.description || null } : {}),
    ...(input.priority !== undefined ? { priority: input.priority } : {}),
    ...(input.tags !== undefined ? { tags: input.tags || [] } : {}),
    updatedById: user.id,
  };

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id: leadId },
      data: updateData,
    });

    await recordHistory(tx, {
      leadId,
      actorId: user.id,
      eventType: "FIELD_UPDATE",
      comment: "Lead details updated",
    });

    return updated;
  });
}

async function changeStatus(user, leadId, { status, comment, lossReason }) {
  const lead = await getLeadForUser(user, leadId);
  await assertCanEdit(user, lead);

  const nextStatus = lead.status === "ON_HOLD" ? status : status;
  const targetStatus = status === "ON_HOLD" ? "ON_HOLD" : status;

  if (lead.status === "ON_HOLD") {
    if (!isValidTransition(lead.status, status, lead.previousStatus)) {
      throw new ApiError(
        422,
        `This lead is on hold and can only resume to ${lead.previousStatus ?? "its previous active status"}.`
      );
    }
  } else if (!isValidTransition(lead.status, status)) {
    throw new ApiError(422, `Cannot move a lead from ${lead.status} to ${status}.`);
  }

  if (status === "LOST" && (!lossReason || !lossReason.trim())) {
    throw new ApiError(422, "A loss reason is required when moving a lead to LOST.");
  }

  return prisma.$transaction(async (tx) => {
    const finalStatus = status === "ON_HOLD" ? "ON_HOLD" : status;
    const finalPreviousStatus = status === "ON_HOLD" ? lead.status : null;

    const updated = await tx.lead.update({
      where: { id: leadId },
      data: {
        status: finalStatus,
        previousStatus: finalPreviousStatus,
        updatedById: user.id,
        conversionDate: finalStatus === "CONVERTED" ? new Date() : lead.conversionDate,
        lossReason: finalStatus === "LOST" ? lossReason || lead.lossReason : lead.lossReason,
      },
    });

    await recordHistory(tx, {
      leadId,
      actorId: user.id,
      eventType: "STATUS_CHANGE",
      fromValue: lead.status,
      toValue: finalStatus,
      comment,
    });

    return updated;
  });
}

async function changePriority(user, leadId, { priority }) {
  const lead = await getLeadForUser(user, leadId);
  await assertCanEdit(user, lead);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id: leadId },
      data: { priority, updatedById: user.id },
    });

    await recordHistory(tx, {
      leadId,
      actorId: user.id,
      eventType: "PRIORITY_CHANGE",
      fromValue: lead.priority,
      toValue: priority,
    });

    return updated;
  });
}

async function assignLead(user, leadId, { userId, reason }) {
  const lead = await getLeadForUser(user, leadId);

  const targetUser = await prisma.users.findFirst({
    where: { id: userId, organizationId: user.organizationId, isActive: true },
    include: { role: { select: { key: true } } },
  });
  if (!targetUser) throw new ApiError(404, "Target user not found.");

  const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];
  if (!canAssignLead(user, targetUser, teamMemberIds)) {
    throw new ApiError(403, "You are not allowed to assign a lead to that user.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id: leadId },
      data: {
        currentAssigneeId: userId,
        assignmentDate: new Date(),
        updatedById: user.id,
      },
    });

    await tx.assignmentHistory.create({
      data: {
        leadId,
        fromUserId: lead.currentAssigneeId,
        toUserId: userId,
        assignedById: user.id,
        reason,
      },
    });

    // Self-assignment needs no "assigned to you" notification.
    if (userId !== user.id) {
      await notifyUser(userId, {
        type: "LEAD_ASSIGNED",
        title: "Lead assigned",
        message: `Lead ${lead.leadCode} was assigned to you.`,
        metadata: { leadId: lead.id, leadCode: lead.leadCode },
      }, tx);
    }

    await recordHistory(tx, {
      leadId,
      actorId: user.id,
      eventType: lead.currentAssigneeId ? "REASSIGNED" : "ASSIGNED",
      fromValue: lead.currentAssigneeId,
      toValue: userId,
      comment: reason,
    });

    return updated;
  });
}

async function softDeleteLead(user, leadId) {
  const lead = await getLeadForUser(user, leadId);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.lead.update({
      where: { id: leadId },
      data: { isDeleted: true, deletedAt: new Date(), deletedById: user.id },
    });

    await recordHistory(tx, {
      leadId,
      actorId: user.id,
      eventType: "DELETED",
      fromValue: lead.status,
    });

    return updated;
  });
}

async function getLeadHistory(user, leadId) {
  await getLeadForUser(user, leadId);
  const events = await prisma.leadHistory.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { id: true, fullName: true } } },
  });

  // Only ASSIGNED/REASSIGNED events store user IDs in fromValue/toValue (every
  // other event type stores enum values like a LeadStatus, which are never
  // valid UUIDs and must never be sent through this lookup).
  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const userIds = events
    .filter((event) => event.eventType === "ASSIGNED" || event.eventType === "REASSIGNED")
    .flatMap((event) => [event.fromValue, event.toValue])
    .filter((value) => value && UUID_PATTERN.test(value));
  const nameLookup = new Map();

  if (userIds.length > 0) {
    const users = await prisma.users.findMany({
      where: { id: { in: [...new Set(userIds)] }, organizationId: user.organizationId },
      select: { id: true, fullName: true },
    });

    for (const row of users) {
      nameLookup.set(row.id, row.fullName);
    }
  }

  return events.map((event) => ({
    ...event,
    fromValue: event.eventType === "ASSIGNED" || event.eventType === "REASSIGNED"
      ? (event.fromValue ? nameLookup.get(event.fromValue) || event.fromValue : event.fromValue)
      : event.fromValue,
    toValue: event.eventType === "ASSIGNED" || event.eventType === "REASSIGNED"
      ? (event.toValue ? nameLookup.get(event.toValue) || event.toValue : event.toValue)
      : event.toValue,
  }));
}

async function addNote(user, leadId, { body }) {
  await getLeadForUser(user, leadId);
  return prisma.leadNote.create({
    data: { leadId, authorId: user.id, body },
    include: { author: { select: { id: true, fullName: true } } },
  });
}

async function listNotes(user, leadId) {
  await getLeadForUser(user, leadId);
  return prisma.leadNote.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    include: { author: { select: { id: true, fullName: true } } },
  });
}

/**
 * Who may edit or delete a note: its author, or a user with broader edit
 * authority over the lead (Admin: all leads; Manager: leads in their scope).
 * Roles that can only edit *assigned* leads (Executives) may change their own
 * notes but never a Manager's or Admin's note on the same lead.
 */
function canModifyNote(user, note, lead, teamMemberIds) {
  if (note.authorId === user.id) return true;
  if (user.permissions.has(PERMISSIONS.LEAD_EDIT_ALL)) return true;
  return (
    user.permissions.has(PERMISSIONS.LEAD_EDIT_SCOPED) && canEditLead(user, lead, teamMemberIds)
  );
}

async function updateNote(user, leadId, noteId, { body }) {
  const lead = await getLeadForUser(user, leadId);
  const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];

  const note = await prisma.leadNote.findFirst({ where: { id: noteId, leadId } });
  if (!note) throw new ApiError(404, "Note not found.");

  if (!canModifyNote(user, note, lead, teamMemberIds)) {
    throw new ApiError(403, "You do not have permission to edit this note.");
  }

  return prisma.leadNote.update({
    where: { id: noteId },
    data: { body },
    include: { author: { select: { id: true, fullName: true } } },
  });
}

async function deleteNote(user, leadId, noteId) {
  const lead = await getLeadForUser(user, leadId);
  const teamMemberIds = user.roleKey === "MANAGER" ? await getTeamMemberIds(user.id) : [];

  const note = await prisma.leadNote.findFirst({ where: { id: noteId, leadId } });
  if (!note) throw new ApiError(404, "Note not found.");

  if (!canModifyNote(user, note, lead, teamMemberIds)) {
    throw new ApiError(403, "You do not have permission to delete this note.");
  }

  await prisma.leadNote.delete({ where: { id: noteId } });
}

module.exports = {
  createLead,
  listLeads,
  getLeadForUser,
  getLeadOr404,
  updateLead,
  changeStatus,
  changePriority,
  assignLead,
  softDeleteLead,
  getLeadHistory,
  addNote,
  listNotes,
  updateNote,
  deleteNote,
  getTeamMemberIds,
};
