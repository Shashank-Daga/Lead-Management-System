const test = require("node:test");
const assert = require("node:assert/strict");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

const { installFakePrisma } = require("./helpers/fakePrisma");
const { PERMISSIONS } = require("../src/config/permissions");

process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET = "profile_test_access_secret_0123456789";
process.env.JWT_REFRESH_SECRET = "profile_test_refresh_secret_0123456789";

const ADMIN_ID = "11111111-1111-4111-8111-111111111111";
const MANAGER_ID = "22222222-2222-4222-8222-222222222222";
const EXEC_ID = "33333333-3333-4333-8333-333333333333";
const OTHER_EXEC_ID = "44444444-4444-4444-8444-444444444444";

function createDb() {
  const role = {
    key: "EXECUTIVE",
    name: "Executive",
  };

  const users = [
    {
      id: ADMIN_ID,
      fullName: "Admin User",
      email: "admin@example.com",
      passwordHash: "not-used",
      phone: null,
      dateOfBirth: null,
      passwordChangedAt: null,
      isActive: true,
      managerId: null,
      role: { key: "ADMIN", name: "Admin" },
      manager: null,
    },
    {
      id: MANAGER_ID,
      fullName: "Manager User",
      email: "manager@example.com",
      passwordHash: "not-used",
      phone: null,
      dateOfBirth: null,
      passwordChangedAt: null,
      isActive: true,
      managerId: null,
      role: { key: "MANAGER", name: "Manager" },
      manager: null,
    },
    {
      id: EXEC_ID,
      fullName: "Executive User",
      email: "executive@example.com",
      passwordHash: "not-used",
      phone: "9876543210",
      dateOfBirth: new Date("1995-06-15T00:00:00.000Z"),
      passwordChangedAt: null,
      isActive: true,
      managerId: MANAGER_ID,
      role,
      manager: {
        id: MANAGER_ID,
        fullName: "Manager User",
      },
    },
    {
      id: OTHER_EXEC_ID,
      fullName: "Other Executive",
      email: "other@example.com",
      passwordHash: "not-used",
      phone: null,
      dateOfBirth: null,
      passwordChangedAt: null,
      isActive: true,
      managerId: null,
      role,
      manager: null,
    },
  ];

  const matches = (user, where = {}) => {
    if (where.id && user.id !== where.id) return false;

    if (where.isActive !== undefined &&
        user.isActive !== where.isActive) {
      return false;
    }

    if (where.managerId !== undefined &&
        user.managerId !== where.managerId) {
      return false;
    }

    if (where.OR) {
      return where.OR.some((condition) => matches(user, condition));
    }

    if (where.AND) {
      return where.AND.every((condition) => matches(user, condition));
    }

    return true;
  };

  const db = {
    users: {
      findUnique: async ({ where }) =>
        users.find((user) => matches(user, where)) || null,

      findMany: async ({ where = {}, orderBy }) => {
        const result = users.filter((user) => matches(user, where));

        if (orderBy?.fullName === "asc") {
          result.sort((a, b) =>
            a.fullName.localeCompare(b.fullName)
          );
        }

        return result;
      },

      findFirst: async ({ where }) =>
        users.find((user) => matches(user, where)) || null,

      update: async ({ where, data }) => {
        const user = users.find((item) => item.id === where.id);

        if (!user) throw new Error("User not found");

        Object.assign(user, data);
        return user;
      },
    },
  };

  return { db, users };
}

function actor(id, permissions = []) {
  return {
    id,
    permissions: new Set(permissions),
  };
}

function loadService(db) {
  installFakePrisma(db);
  return require("../src/services/profile.service");
}

test("getOwnProfile returns safe profile data and formats date of birth", async () => {
  const { db } = createDb();
  const service = loadService(db);

  const profile = await service.getOwnProfile(EXEC_ID);

  assert.equal(profile.id, EXEC_ID);
  assert.equal(profile.fullName, "Executive User");
  assert.equal(profile.dateOfBirth, "1995-06-15");
  assert.equal(profile.phone, "9876543210");
  assert.equal(profile.roleKey, "EXECUTIVE");

  assert.equal("passwordHash" in profile, false);
  assert.equal("passwordChangedAt" in profile, false);
  assert.equal("personalEmail" in profile, false);
});

test("updateOwnProfile updates only the signed-in user's fields", async () => {
  const { db, users } = createDb();
  const service = loadService(db);

  const result = await service.updateOwnProfile(
    actor(EXEC_ID),
    {
      phone: "9111122233",
      dateOfBirth: "2000-01-20",
    }
  );

  const saved = users.find((user) => user.id === EXEC_ID);

  assert.equal(saved.phone, "9111122233");
  assert.equal(
    saved.dateOfBirth.toISOString().slice(0, 10),
    "2000-01-20"
  );

  assert.equal(result.id, EXEC_ID);
  assert.equal(result.dateOfBirth, "2000-01-20");

  const other = users.find((user) => user.id === OTHER_EXEC_ID);
  assert.equal(other.phone, null);
});

test("manager can see self and active direct reports only", async () => {
  const { db } = createDb();
  const service = loadService(db);

  const manager = actor(MANAGER_ID, [
    PERMISSIONS.LEAD_VIEW_SCOPED,
  ]);

  const profiles = await service.listVisibleProfiles(manager);
  const ids = profiles.map((profile) => profile.id);

  assert.ok(ids.includes(MANAGER_ID));
  assert.ok(ids.includes(EXEC_ID));
  assert.ok(!ids.includes(OTHER_EXEC_ID));
  assert.ok(!ids.includes(ADMIN_ID));
});

test("executive can see only their own profile", async () => {
  const { db } = createDb();
  const service = loadService(db);

  const executive = actor(EXEC_ID, [
    PERMISSIONS.LEAD_VIEW_ASSIGNED,
  ]);

  const profiles = await service.listVisibleProfiles(executive);

  assert.deepEqual(
    profiles.map((profile) => profile.id),
    [EXEC_ID]
  );
});

test("administrator can see all profiles", async () => {
  const { db } = createDb();
  const service = loadService(db);

  const admin = actor(ADMIN_ID, [
    PERMISSIONS.USER_MANAGE,
  ]);

  const profiles = await service.listVisibleProfiles(admin);

  assert.equal(profiles.length, 4);
});

test("getVisibleProfile returns 404 for a profile outside the actor's scope", async () => {
  const { db } = createDb();
  const service = loadService(db);

  const executive = actor(EXEC_ID, [
    PERMISSIONS.LEAD_VIEW_ASSIGNED,
  ]);

  await assert.rejects(
    () => service.getVisibleProfile(executive, OTHER_EXEC_ID),
    (error) => error.statusCode === 404
  );
});

test("changeOwnPassword rejects an incorrect current password", async () => {
  const { db, users } = createDb();

  users.find((user) => user.id === EXEC_ID).passwordHash =
    await argon2.hash("CorrectPassword123");

  const service = loadService(db);

  await assert.rejects(
    () =>
      service.changeOwnPassword(actor(EXEC_ID), {
        currentPassword: "WrongPassword123",
        newPassword: "NewPassword456",
      }),
    (error) =>
      error.statusCode === 422 &&
      /Current password is incorrect/.test(error.message)
  );
});

test("changeOwnPassword stores a new hash and returns fresh credentials", async () => {
  const { db, users } = createDb();
  const user = users.find((item) => item.id === EXEC_ID);

  user.passwordHash = await argon2.hash("CorrectPassword123");

  const service = loadService(db);

  const credentials = await service.changeOwnPassword(
    actor(EXEC_ID),
    {
      currentPassword: "CorrectPassword123",
      newPassword: "NewPassword456",
    }
  );

  assert.ok(user.passwordChangedAt instanceof Date);
  assert.notEqual(user.passwordHash, "CorrectPassword123");
  assert.equal(
    await argon2.verify(user.passwordHash, "NewPassword456"),
    true
  );

  const access = jwt.verify(
    credentials.accessToken,
    process.env.JWT_ACCESS_SECRET
  );

  const refresh = jwt.verify(
    credentials.refreshToken,
    process.env.JWT_REFRESH_SECRET
  );

  assert.equal(access.sub, EXEC_ID);
  assert.equal(refresh.sub, EXEC_ID);
  assert.equal(refresh.type, "refresh");
});
