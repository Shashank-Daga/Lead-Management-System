const test = require("node:test");
const assert = require("node:assert/strict");

const {
  updateProfileSchema,
  changePasswordSchema,
  profileIdParamSchema,
} = require("../src/validators/profile.schema");

test("profile update accepts a 10-digit phone and a date of birth", () => {
  const result = updateProfileSchema.safeParse({
    phone: "9876543210",
    dateOfBirth: "1995-06-15",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.phone, "9876543210");
  assert.equal(result.data.dateOfBirth, "1995-06-15");
});

test("profile update trims surrounding whitespace around the phone", () => {
  const result = updateProfileSchema.safeParse({ phone: " 9876543210 " });

  assert.equal(result.success, true);
  assert.equal(result.data.phone, "9876543210");
});

test("phone must be exactly 10 digits", () => {
  for (const phone of [
    "+91 98765 43210", // country code and spaces
    "+919876543210",
    "98765 43210", // inner space
    "987-654-3210",
    "(987)6543210",
    "987654321", // 9 digits
    "98765432101", // 11 digits
    "12345",
    "abcdefghij",
    "987654321a",
  ]) {
    assert.equal(
      updateProfileSchema.safeParse({ phone }).success,
      false,
      `expected ${JSON.stringify(phone)} to be rejected`
    );
  }
});

test("profile update permits clearing optional fields", () => {
  const result = updateProfileSchema.safeParse({
    phone: "",
    dateOfBirth: "",
  });

  assert.equal(result.success, true);

  assert.equal(result.data.phone, null);
  assert.equal(result.data.dateOfBirth, null);
});

test("profile update rejects future dates of birth", () => {
  const futureDate = new Date(Date.now() + 86400000)
    .toISOString()
    .slice(0, 10);

  const result = updateProfileSchema.safeParse({
    dateOfBirth: futureDate,
  });

  assert.equal(result.success, false);
});

test("profile update rejects invalid calendar dates", () => {
  const result = updateProfileSchema.safeParse({
    dateOfBirth: "2001-02-30",
  });

  assert.equal(result.success, false);
});

test("profile update rejects unsupported fields", () => {
  for (const extra of [
    { email: "new@example.com" },
    { personalEmail: "personal@example.com" },
    { fullName: "Renamed" },
    { roleKey: "ADMIN" },
    { roleId: "x" },
    { managerId: null },
    { isActive: false },
    { id: "11111111-1111-4111-8111-111111111111" },
    { passwordHash: "x" },
  ]) {
    assert.equal(
      updateProfileSchema.safeParse({ phone: "9876543210", ...extra }).success,
      false,
      `expected ${JSON.stringify(extra)} to be rejected`
    );
  }
});

test("profile update rejects an empty request", () => {
  const result = updateProfileSchema.safeParse({});

  assert.equal(result.success, false);
});

test("password change enforces the minimum length and rejects unknown fields", () => {
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: "OldPassword123",
      newPassword: "short1",
      confirmPassword: "short1",
    }).success,
    false
  );

  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: "OldPassword123",
      newPassword: "NewPassword123",
      confirmPassword: "NewPassword123",
      userId: "11111111-1111-4111-8111-111111111111",
    }).success,
    false
  );
});

test("password change requires matching new and confirmation passwords", () => {
  const result = changePasswordSchema.safeParse({
    currentPassword: "OldPassword123",
    newPassword: "NewPassword123",
    confirmPassword: "DifferentPassword123",
  });

  assert.equal(result.success, false);
});

test("password change rejects reusing the current password", () => {
  const result = changePasswordSchema.safeParse({
    currentPassword: "SamePassword123",
    newPassword: "SamePassword123",
    confirmPassword: "SamePassword123",
  });

  assert.equal(result.success, false);
});

test("profile ID must be a UUID", () => {
  assert.equal(
    profileIdParamSchema.safeParse({
      userId: "11111111-1111-4111-8111-111111111111",
    }).success,
    true
  );

  assert.equal(
    profileIdParamSchema.safeParse({
      userId: "not-a-uuid",
    }).success,
    false
  );
});
