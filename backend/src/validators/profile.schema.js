const { z } = require("zod");

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

const clearableText = (schema) =>
  z.preprocess(
    (value) =>
      typeof value === "string"
        ? value.trim() === ""
          ? null
          : value.trim()
        : value,
    schema.nullable().optional()
  );

// Exactly 10 digits, nothing else (no spaces, "+" or country code).
const phoneSchema = z
  .string()
  .regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits");

const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date of birth")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value
    );
  }, "Enter a valid date of birth")
  .refine(
    (value) => value <= new Date().toISOString().slice(0, 10),
    "Date of birth cannot be in the future"
  );

const updateProfileSchema = z
  .object({
    phone: clearableText(phoneSchema),
    dateOfBirth: clearableText(dateOfBirthSchema),
  })
  .strict()
  .refine(
    (value) =>
      value.phone !== undefined ||
      value.dateOfBirth !== undefined,
    { message: "Provide at least one field to update." }
  );

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Current password is required")
      .max(PASSWORD_MAX),
    newPassword: z
      .string()
      .min(
        PASSWORD_MIN,
        `Password must be at least ${PASSWORD_MIN} characters`
      )
      .max(PASSWORD_MAX),
    confirmPassword: z
      .string()
      .min(1, "Please confirm the new password"),
  })
  .strict()
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

const profileIdParamSchema = z.object({
  userId: z.string().uuid("Invalid user id"),
});

module.exports = {
  updateProfileSchema,
  changePasswordSchema,
  profileIdParamSchema,
};
