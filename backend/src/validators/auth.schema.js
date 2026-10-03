const { z } = require("zod");

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const createUserSchema = z.object({
  fullName: z.string().min(1).max(150),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  roleKey: z.enum(["ADMIN", "MANAGER", "EXECUTIVE"]),
  managerId: z.string().uuid().optional(),
});

const updateUserSchema = z.object({
  fullName: z.string().min(1).max(150).optional(),
  roleKey: z.enum(["ADMIN", "MANAGER", "EXECUTIVE"]).optional(),
  managerId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

module.exports = { loginSchema, refreshSchema, createUserSchema, updateUserSchema };
