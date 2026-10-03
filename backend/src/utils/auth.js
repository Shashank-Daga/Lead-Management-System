const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

/** Hash a plaintext password with Argon2id (memory-hard, resists GPU cracking). */
async function hashPassword(plain) {
  return argon2.hash(plain, { type: argon2.argon2id });
}

/** Verify a plaintext password against a stored Argon2 hash. */
async function verifyPassword(hash, plain) {
  return argon2.verify(hash, plain);
}

/** Issue a short-lived access token carrying the minimum claims needed for authz. */
function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, roleKey: user.role.key, orgId: user.organizationId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );
}

/** Issue a longer-lived refresh token used only to mint new access tokens. */
function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, type: "refresh" }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  // Defense in depth: a refresh token must never authenticate an API call,
  // even if the two signing secrets were accidentally configured identically.
  if (payload.type === "refresh") throw new Error("Wrong token type");
  return payload;
}

function verifyRefreshToken(token) {
  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  // Likewise, only tokens explicitly minted as refresh tokens may be refreshed.
  if (payload.type !== "refresh") throw new Error("Wrong token type");
  return payload;
}

module.exports = {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
