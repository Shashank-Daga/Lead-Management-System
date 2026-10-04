const prisma = require("../config/prisma");
const { verifyAccessToken } = require("../utils/auth");
const { ApiError, asyncHandler } = require("../utils/http");

/**
 * Verifies the Bearer access token and attaches `req.user` with the role's
 * permission set resolved, so downstream middleware/services never need to
 * re-query the DB just to answer "can this user do X?".
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) throw new ApiError(401, "Authentication required.");

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new ApiError(401, "Invalid or expired token.");
  }

  const user = await prisma.users.findUnique({
    where: { id: payload.sub },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  if (!user || !user.isActive) {
    throw new ApiError(401, "Account is inactive or no longer exists.");
  }

  req.user = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    roleKey: user.role.key,
    managerId: user.managerId,
    permissions: new Set(user.role.permissions.map((rp) => rp.permission.key)),
  };

  next();
});

module.exports = authenticate;
