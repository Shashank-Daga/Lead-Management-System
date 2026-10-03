const prisma = require("../config/prisma");
const { ApiError } = require("../utils/http");
const { hashPassword } = require("../utils/auth");
const { notifyUser } = require("./notification.service");

async function notifyManagerForExecutiveAssignment(
  tx,
  executiveUser,
  managerId,
  existingManagerId = null,
) {
  if (!managerId || managerId === existingManagerId) return;

  const manager = await tx.users.findFirst({
    where: {
      id: managerId,
      organizationId: executiveUser.organizationId,
      isActive: true,
    },
    select: { id: true, fullName: true },
  });

  if (!manager) return;

  await notifyUser(
    manager.id,
    {
      type: "EXECUTIVE_ASSIGNED",
      title: "Executive assigned to you",
      message: `${executiveUser.fullName} is now assigned to your team.`,
      metadata: {
        executiveId: executiveUser.id,
        executiveName: executiveUser.fullName,
        organizationId: executiveUser.organizationId,
      },
    },
    tx,
  );
}

async function validateUserHierarchy(
  organizationId,
  { roleKey, managerId, existingUserId } = {},
) {
  const nextRoleKey =
    roleKey ||
    (existingUserId
      ? await prisma.users
        .findUnique({
          where: { id: existingUserId },
          select: { role: { select: { key: true } } },
        })
        .then((u) => u?.role?.key)
      : null);

  if (!nextRoleKey) return;

  if (nextRoleKey === "ADMIN" || nextRoleKey === "MANAGER") {
    if (managerId) {
      throw new ApiError(
        422,
        "Admins and managers cannot have a manager assignment.",
      );
    }
    return;
  }

  if (nextRoleKey !== "EXECUTIVE") {
    throw new ApiError(422, `Unsupported role: ${nextRoleKey}`);
  }

  if (!managerId) {
    throw new ApiError(422, "Executives must have a manager.");
  }

  const manager = await prisma.users.findFirst({
    where: { id: managerId, organizationId, isActive: true },
    include: { role: { select: { key: true } } },
  });

  if (!manager || manager.role.key !== "MANAGER") {
    throw new ApiError(
      422,
      "Executive manager must be a valid active manager in the same organization.",
    );
  }
}

async function listUsers(organizationId) {
  return prisma.users.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      isActive: true,
      createdAt: true,
      role: { select: { key: true, name: true } },
      manager: { select: { id: true, fullName: true } },
    },
  });
}

async function listAssignableUsers(actor) {
  if (
    !actor.permissions.has("lead.assign") &&
    !actor.permissions.has("lead.reassign")
  )
    return [];

  if (actor.roleKey === "ADMIN") {
    const users = await prisma.users.findMany({
      where: {
        organizationId: actor.organizationId,
        isActive: true,
        role: { is: { key: { in: ["MANAGER", "EXECUTIVE"] } } },
      },
      select: {
        id: true,
        fullName: true,
        role: { select: { key: true } },
        isActive: true,
      },
      orderBy: { fullName: "asc" },
    });

    return users.sort((a, b) => {
      const rank = { MANAGER: 0, EXECUTIVE: 1 };

      return (
        rank[a.role.key] - rank[b.role.key] ||
        a.fullName.localeCompare(b.fullName)
      );
    });
  }

  if (actor.roleKey === "MANAGER") {
    const teamMemberIds = await prisma.users
      .findMany({
        where: { managerId: actor.id, isActive: true },
        select: { id: true },
      })
      .then((rows) => rows.map((row) => row.id));

    // A Manager may assign to themselves or to their own active Executives —
    // exactly what canAssignLead() permits — so no role filter here: the
    // Manager is in this list by design, and everyone else in it reports to
    // them (only Executives can have a manager).
    const ids = [actor.id, ...teamMemberIds];
    return prisma.users.findMany({
      where: {
        id: { in: ids },
        organizationId: actor.organizationId,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        role: { select: { key: true } },
        isActive: true,
      },
      orderBy: { fullName: "asc" },
    });
  }

  return [];
}

async function createUser(organizationId, input) {
  const role = await prisma.role.findUnique({ where: { key: input.roleKey } });
  if (!role) throw new ApiError(400, `Unknown role: ${input.roleKey}`);

  await validateUserHierarchy(organizationId, {
    roleKey: input.roleKey,
    managerId: input.managerId,
  });

  const passwordHash = await hashPassword(input.password);

  return prisma.$transaction(async (tx) => {
    const created = await tx.users.create({
      data: {
        organizationId,
        fullName: input.fullName,
        email: input.email,
        passwordHash,
        roleId: role.id,
        managerId: input.managerId || null,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
        organizationId: true,
      },
    });

    if (input.roleKey === "EXECUTIVE" && input.managerId) {
      await notifyManagerForExecutiveAssignment(
        tx,
        {
          ...created,
          fullName: created.fullName,
          organizationId: created.organizationId,
        },
        input.managerId,
      );
    }

    return created;
  });
}

async function updateUser(organizationId, userId, input) {
  const user = await prisma.users.findFirst({
    where: { id: userId, organizationId },
  });
  if (!user) throw new ApiError(404, "User not found.");

  let roleId = undefined;
  const currentRoleKeyBefore = user.roleId
    ? (
      await prisma.role.findUnique({
        where: { id: user.roleId },
        select: { key: true },
      })
    )?.key
    : undefined;
  let nextRoleKey = user.roleId
    ? (
      await prisma.role.findUnique({
        where: { id: user.roleId },
        select: { key: true },
      })
    )?.key
    : undefined;

  if (input.roleKey) {
    const role = await prisma.role.findUnique({
      where: { key: input.roleKey },
    });
    if (!role) throw new ApiError(400, `Unknown role: ${input.roleKey}`);
    roleId = role.id;
    nextRoleKey = input.roleKey;
  }

  // Executives whose Manager was deactivated sit under direct Admin ownership
  // (managerId = null). Renaming or (de)activating such a user must not be
  // blocked by the "Executives need a manager" rule, so hierarchy validation
  // only runs when the role or manager is actually being changed.
  const hierarchyChanging =
    input.managerId !== undefined ||
    (input.roleKey && input.roleKey !== currentRoleKeyBefore);
  if (hierarchyChanging) {
    const targetManagerId =
      input.managerId === undefined ? user.managerId : input.managerId;
    await validateUserHierarchy(organizationId, {
      roleKey: nextRoleKey,
      managerId: targetManagerId,
      existingUserId: userId,
    });
  }

  return prisma.$transaction(async (tx) => {
    // Same rule as deactivateUser(): a Manager going inactive releases their
    // active Executives to Admin ownership inside this same transaction.
    if (
      input.isActive === false &&
      user.isActive &&
      currentRoleKeyBefore === "MANAGER"
    ) {
      await tx.users.updateMany({
        where: {
          organizationId,
          role: { is: { key: "EXECUTIVE" } },
          managerId: userId,
          isActive: true,
        },
        data: { managerId: null },
      });
    }

    const updated = await tx.users.update({
      where: { id: userId },
      data: {
        fullName: input.fullName,
        roleId,
        managerId: input.managerId === undefined ? undefined : input.managerId,
        isActive: input.isActive,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        organizationId: true,
        managerId: true,
      },
    });

    const currentRoleKey = nextRoleKey ?? user.role?.key;
    if (currentRoleKey === "EXECUTIVE" && input.managerId !== undefined) {
      await notifyManagerForExecutiveAssignment(
        tx,
        {
          ...updated,
          fullName: updated.fullName,
          organizationId: updated.organizationId,
        },
        updated.managerId,
        user.managerId,
      );
    }

    return updated;
  });
}

/**
 * Deactivates a user and — if they're a Manager — reassigns their active
 * Executives to direct Admin ownership (managerId = null, the existing
 * convention for "reports to Admin") in the SAME database transaction.
 *
 * This must be atomic: if the reassignment succeeded but the deactivation
 * failed (or vice versa), we'd either leave an active Manager with no
 * reports, or leave Executives silently reporting to a now-inactive Manager.
 * Both are invalid states the hierarchy validator would normally prevent.
 */
async function deactivateUser(organizationId, userId) {
  const user = await prisma.users.findFirst({
    where: { id: userId, organizationId },
    include: { role: { select: { key: true } } },
  });

  if (!user) throw new ApiError(404, "User not found.");

  return prisma.$transaction(async (tx) => {
    if (user.role.key === "MANAGER") {
      await tx.users.updateMany({
        where: {
          organizationId,
          role: { is: { key: "EXECUTIVE" } },
          managerId: userId,
          isActive: true,
        },
        data: { managerId: null },
      });
    }

    return tx.users.update({
      where: { id: userId },
      data: { isActive: false },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        organizationId: true,
        managerId: true,
      },
    });
  });
}

module.exports = {
  listUsers,
  listAssignableUsers,
  createUser,
  updateUser,
  deactivateUser,
  validateUserHierarchy,
};
