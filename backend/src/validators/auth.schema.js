const { z } = require("zod");

// Emails are matched case-insensitively: trim and lowercase before they are
// stored or looked up, so "Foo@Bar.com" and "foo@bar.com" are the same account.
const emailSchema = z.string().trim().toLowerCase().email();

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const createUserSchema = z.object({
  fullName: z.string().min(1).max(150),
  email: emailSchema,
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
