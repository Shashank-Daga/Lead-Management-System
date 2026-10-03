const userService = require("../services/user.service");
const { asyncHandler } = require("../utils/http");
const { createUserSchema, updateUserSchema } = require("../validators/auth.schema");

const list = asyncHandler(async (req, res) => {
  const users = await userService.listUsers(req.user.organizationId);
  res.json(users);
});

const listAssignable = asyncHandler(async (req, res) => {
  const users = await userService.listAssignableUsers(req.user);
  res.json(users);
});

const create = asyncHandler(async (req, res) => {
  const input = createUserSchema.parse(req.body);
  const user = await userService.createUser(req.user.organizationId, input);
  res.status(201).json(user);
});

const update = asyncHandler(async (req, res) => {
  const input = updateUserSchema.parse(req.body);
  const user = await userService.updateUser(req.user.organizationId, req.params.userId, input);
  res.json(user);
});

const deactivate = asyncHandler(async (req, res) => {
  const user = await userService.deactivateUser(req.user.organizationId, req.params.userId);
  res.json(user);
});

module.exports = { list, listAssignable, create, update, deactivate };
