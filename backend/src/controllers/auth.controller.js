const authService = require("../services/auth.service");
const { loginSchema, refreshSchema } = require("../validators/auth.schema");
const { asyncHandler } = require("../utils/http");

const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const result = await authService.login(email, password);
  res.json(result);
});

const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await authService.refresh(refreshToken);
  res.json(result);
});

/** Returns the currently authenticated user's profile + permissions (populated by `authenticate`). */
const me = asyncHandler(async (req, res) => {
  res.json({
    id: req.user.id,
    fullName: req.user.fullName,
    email: req.user.email,
    roleKey: req.user.roleKey,
    permissions: [...req.user.permissions],
  });
});

module.exports = { login, refresh, me };
