const prisma = require("../config/prisma");
const { PERMISSIONS } = require("../config/permissions");
const { ApiError } = require("../utils/http");
const {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
} = require("../utils/auth");

const PROFILE_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  dateOfBirth: true,
  isActive: true,
  role: { select: { key: true, name: true } },
  manager: { select: { id: true, fullName: true } },
};

function toProfile(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? null,
    dateOfBirth: user.dateOfBirth
      ? user.dateOfBirth.toISOString().slice(0, 10)
      : null,
    isActive: user.isActive,
    roleKey: user.role.key,
    roleName: user.role.name,
    manager: user.manager
      ? { id: user.manager.id, fullName: user.manager.fullName }
      : null,
  };
}

function fieldError(status, field, message) {
  return new ApiError(status, message, [
    { path: [field], message },
  ]);
}

function visibleProfilesWhere(actor) {
  if (actor.permissions.has(PERMISSIONS.USER_MANAGE)) {
    return {};
  }

  if (actor.permissions.has(PERMISSIONS.LEAD_VIEW_SCOPED)) {
    return {
      OR: [
        { id: actor.id },
        { managerId: actor.id, isActive: true },
      ],
    };
  }

  return { id: actor.id };
}

async function getOwnProfile(userId) {
  const user = await prisma.users.findUnique({
    where: { id: userId },
    select: PROFILE_SELECT,
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return toProfile(user);
}

async function listVisibleProfiles(actor) {
  const users = await prisma.users.findMany({
    where: visibleProfilesWhere(actor),
    orderBy: { fullName: "asc" },
    select: PROFILE_SELECT,
  });

  return users.map(toProfile);
}

async function getVisibleProfile(actor, userId) {
  const user = await prisma.users.findFirst({
    where: {
      AND: [
        { id: userId },
        visibleProfilesWhere(actor),
      ],
    },
    select: PROFILE_SELECT,
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  return toProfile(user);
}

async function updateOwnProfile(actor, input) {
  const current = await prisma.users.findUnique({
    where: { id: actor.id },
    select: { id: true },
  });

  if (!current) {
    throw new ApiError(404, "User not found.");
  }

  const data = {};

  if (input.phone !== undefined) {
    data.phone = input.phone;
  }

  if (input.dateOfBirth !== undefined) {
    data.dateOfBirth =
      input.dateOfBirth === null
        ? null
        : new Date(`${input.dateOfBirth}T00:00:00.000Z`);
  }

  if (Object.keys(data).length === 0) {
    return getOwnProfile(actor.id);
  }

  const updated = await prisma.users.update({
    where: { id: actor.id },
    data,
    select: PROFILE_SELECT,
  });

  return toProfile(updated);
}

async function changeOwnPassword(actor, {
  currentPassword,
  newPassword,
}) {
  const user = await prisma.users.findUnique({
    where: { id: actor.id },
    include: { role: true },
  });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  if (!(await verifyPassword(user.passwordHash, currentPassword))) {
    throw fieldError(
      422,
      "currentPassword",
      "Current password is incorrect."
    );
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.users.update({
    where: { id: actor.id },
    data: {
      passwordHash,
      passwordChangedAt: new Date(),
    },
    select: { id: true },
  });

  // Issue fresh credentials after successfully changing the password.
  return {
    accessToken: signAccessToken(user),
    refreshToken: signRefreshToken(user),
  };
}

module.exports = {
  getOwnProfile,
  listVisibleProfiles,
  getVisibleProfile,
  updateOwnProfile,
  changeOwnPassword,
  visibleProfilesWhere,
};
