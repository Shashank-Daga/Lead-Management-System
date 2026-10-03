const prisma = require("../config/prisma");
const { ApiError } = require("../utils/http");
const {
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../utils/auth");

async function login(email, password) {
  const user = await prisma.users.findUnique({
    where: { email },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  // Deliberately generic message — do not reveal whether the email exists.
  if (!user || !user.isActive) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    throw new ApiError(401, "Invalid email or password.");
  }

  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      roleKey: user.role.key,
      permissions: user.role.permissions.map((rp) => rp.permission.key),
    },
  };
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(401, "Invalid or expired refresh token.");
  }

  const user = await prisma.users.findUnique({
    where: { id: payload.sub },
    include: { role: true },
  });
  if (!user || !user.isActive) throw new ApiError(401, "Account no longer active.");

  return { accessToken: signAccessToken(user) };
}

module.exports = { login, refresh };
