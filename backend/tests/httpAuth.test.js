// HTTP-level tests: real Express app + real JWT + real Argon2, with the database
// replaced by an in-memory fake. Exercises middleware order (authenticate ->
// authorize), status codes, and response shapes exactly as a client sees them.
process.env.JWT_ACCESS_SECRET = "http_test_access_secret_0123456789abcdef";
process.env.JWT_REFRESH_SECRET = "http_test_refresh_secret_0123456789abcdef";
process.env.NODE_ENV = "test";

const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const argon2 = require("argon2");
const { installFakePrisma } = require("./helpers/fakePrisma");
const { PERMISSIONS } = require("../src/config/permissions");

const ORG = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const EXEC_ID = "11111111-1111-4111-8111-111111111111";

function roleWith(key, permissionKeys) {
  return { key, permissions: permissionKeys.map((k) => ({ permission: { key: k } })) };
}

async function buildApp() {
  const passwordHash = await argon2.hash("Correct-Horse-1", { type: argon2.argon2id });
  const users = {
    [EXEC_ID]: {
      id: EXEC_ID,
      fullName: "Eli Exec",
      email: "eli@example.com",
      passwordHash,
      isActive: true,
      managerId: null,
      role: roleWith("EXECUTIVE", [PERMISSIONS.LEAD_VIEW_ASSIGNED]),
    },
  };
  installFakePrisma({
    users: {
      findUnique: async ({ where }) =>
        where.id ? users[where.id] || null : Object.values(users).find((u) => u.email === where.email) || null,
    },
    lead: { count: async () => 0, findMany: async () => [] },
  });
  return require("../src/app");
}

const signAccess = (payload = {}, opts = {}) =>
  jwt.sign({ sub: EXEC_ID, ...payload }, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m", ...opts });

test("GET /health is public", async () => {
  const app = await buildApp();
  const res = await request(app).get("/health");
  assert.equal(res.status, 200);
});

test("login: success returns tokens and permissions", async () => {
  const app = await buildApp();
  const res = await request(app).post("/api/auth/login").send({ email: "eli@example.com", password: "Correct-Horse-1" });
  assert.equal(res.status, 200);
  assert.ok(res.body.accessToken && res.body.refreshToken);
  assert.equal(res.body.user.roleKey, "EXECUTIVE");
  assert.ok(!("passwordHash" in res.body.user));
});

test("login: wrong password and unknown email are indistinguishable 401s", async () => {
  const app = await buildApp();
  const bad = await request(app).post("/api/auth/login").send({ email: "eli@example.com", password: "nope" });
  const unknown = await request(app).post("/api/auth/login").send({ email: "who@example.com", password: "nope" });
  assert.equal(bad.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(bad.body.error.message, unknown.body.error.message);
});

test("login: malformed body is a 422 validation error", async () => {
  const app = await buildApp();
  const res = await request(app).post("/api/auth/login").send({ email: "not-an-email" });
  assert.equal(res.status, 422);
});

test("protected route: missing token -> 401", async () => {
  const app = await buildApp();
  assert.equal((await request(app).get("/api/leads")).status, 401);
});

test("protected route: garbage token -> 401", async () => {
  const app = await buildApp();
  const res = await request(app).get("/api/leads").set("Authorization", "Bearer not.a.jwt");
  assert.equal(res.status, 401);
});

test("protected route: expired token -> 401", async () => {
  const app = await buildApp();
  const expired = signAccess({}, { expiresIn: -10 });
  const res = await request(app).get("/api/leads").set("Authorization", `Bearer ${expired}`);
  assert.equal(res.status, 401);
});

test("protected route: token signed with wrong secret -> 401", async () => {
  const app = await buildApp();
  const forged = jwt.sign({ sub: EXEC_ID }, "attacker-secret");
  const res = await request(app).get("/api/leads").set("Authorization", `Bearer ${forged}`);
  assert.equal(res.status, 401);
});

test("protected route: valid token works", async () => {
  const app = await buildApp();
  const res = await request(app).get("/api/leads").set("Authorization", `Bearer ${signAccess()}`);
  assert.equal(res.status, 200);
});

test("refresh: valid refresh token yields a new access token", async () => {
  const app = await buildApp();
  const login = await request(app).post("/api/auth/login").send({ email: "eli@example.com", password: "Correct-Horse-1" });
  const res = await request(app).post("/api/auth/refresh").send({ refreshToken: login.body.refreshToken });
  assert.equal(res.status, 200);
  assert.ok(res.body.accessToken);
});

test("refresh: garbage token -> 401", async () => {
  const app = await buildApp();
  const res = await request(app).post("/api/auth/refresh").send({ refreshToken: "junk" });
  assert.equal(res.status, 401);
});

test("refresh: an access token is rejected as a refresh token", async () => {
  const app = await buildApp();
  const res = await request(app).post("/api/auth/refresh").send({ refreshToken: signAccess() });
  assert.equal(res.status, 401);
});

test("refresh: token signed with the refresh secret but wrong type is rejected", async () => {
  const app = await buildApp();
  const wrongType = jwt.sign({ sub: EXEC_ID, type: "access" }, process.env.JWT_REFRESH_SECRET, { expiresIn: "1h" });
  const res = await request(app).post("/api/auth/refresh").send({ refreshToken: wrongType });
  assert.equal(res.status, 401);
});

test("access: a refresh token cannot authenticate API requests", async () => {
  const app = await buildApp();
  const login = await request(app).post("/api/auth/login").send({ email: "eli@example.com", password: "Correct-Horse-1" });
  const res = await request(app).get("/api/leads").set("Authorization", `Bearer ${login.body.refreshToken}`);
  assert.equal(res.status, 401);
});

test("RBAC: executive without user.manage is 403 on /api/users", async () => {
  const app = await buildApp();
  const res = await request(app).get("/api/users").set("Authorization", `Bearer ${signAccess()}`);
  assert.equal(res.status, 403);
});

test("RBAC: executive without lead.create is 403 on POST /api/leads", async () => {
  const app = await buildApp();
  const res = await request(app)
    .post("/api/leads")
    .set("Authorization", `Bearer ${signAccess()}`)
    .send({ clientName: "x", contactPerson: "y", phone: "123456", source: "web" });
  assert.equal(res.status, 403);
});

test("RBAC: executive without export.data is 403 on CSV export", async () => {
  const app = await buildApp();
  const res = await request(app).get("/api/dashboard/export/leads.csv").set("Authorization", `Bearer ${signAccess()}`);
  assert.equal(res.status, 403);
});

test("unknown route -> 404 JSON", async () => {
  const app = await buildApp();
  const res = await request(app).get("/api/nope");
  assert.equal(res.status, 404);
});

