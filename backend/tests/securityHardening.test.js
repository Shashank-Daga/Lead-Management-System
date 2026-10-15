// Regression tests for: proxy-aware rate limiting, admin lock-out protection,
// case-insensitive emails and CSV formula injection.
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildWorld } = require("./helpers/world");

// ---- 1. Rate limiting behind a proxy ----------------------------------------
test("Login limiter counts each client IP (X-Forwarded-For) separately, not one shared bucket", async () => {
  const w = buildWorld();
  const statuses = [];
  for (let i = 1; i <= 25; i++) {
    const res = await w.request().post("/api/auth/login").set("X-Forwarded-For", `203.0.113.${i}`).send({ email: "nobody@example.com", password: "x" });
    statuses.push(res.status);
  }
  assert.ok(!statuses.includes(429), `25 different clients must not rate-limit each other: ${statuses.join(",")}`);
});

test("Login limiter still throttles ONE client that keeps failing", async () => {
  const w = buildWorld();
  let blockedAt = null;
  for (let i = 1; i <= 25 && !blockedAt; i++) {
    const res = await w.request().post("/api/auth/login").set("X-Forwarded-For", "198.51.100.7").send({ email: "nobody@example.com", password: "x" });
    if (res.status === 429) blockedAt = i;
  }
  assert.ok(blockedAt && blockedAt <= 21, `expected throttling by the 21st attempt, got ${blockedAt}`);
});

// ---- 2. Admin lock-out protection ------------------------------------------
test("Admin cannot deactivate their own account", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.admin).post(`/api/users/${w.users.admin.id}/deactivate`);
  assert.equal(res.status, 422);
  assert.match(res.body.error.message, /own account/i);
  assert.equal(w.db.tables.users.find((u) => u.id === w.users.admin.id).isActive, true);
});

test("Admin cannot change their own role or deactivate themselves through the edit endpoint", async () => {
  const w = buildWorld();
  const a = w.as(w.users.admin);
  const demote = await a.patch(`/api/users/${w.users.admin.id}`).send({ roleKey: "EXECUTIVE", managerId: w.users.mgrA1.id });
  assert.equal(demote.status, 422);
  const off = await a.patch(`/api/users/${w.users.admin.id}`).send({ isActive: false });
  assert.equal(off.status, 422);
  // Editing their own name is still fine.
  const rename = await a.patch(`/api/users/${w.users.admin.id}`).send({ fullName: "Renamed Admin" });
  assert.equal(rename.status, 200);
});

test("The last active Admin can never be deactivated or demoted, even by someone else", async () => {
  const w = buildWorld();
  const { deactivateUser, updateUser } = require("../src/services/user.service");
  // Another admin exists -> removing one is fine.
  await deactivateUser(w.users.adminB.id, w.users.admin.id);
  assert.equal(w.db.tables.users.find((u) => u.id === w.users.adminB.id).isActive, false);
  // Now `admin` is the last active admin; an actor other than them is refused.
  await assert.rejects(() => deactivateUser(w.users.admin.id, "someone-else"), /At least one active Admin/);
  await assert.rejects(
    () => updateUser(w.users.admin.id, { roleKey: "MANAGER" }, "someone-else"),
    /At least one active Admin/
  );
  assert.equal(w.db.tables.users.find((u) => u.id === w.users.admin.id).isActive, true);
});

test("Admins can still deactivate other users (including other admins while one remains)", async () => {
  const w = buildWorld();
  assert.equal((await w.as(w.users.admin).post(`/api/users/${w.users.execA2.id}/deactivate`)).status, 200);
  assert.equal((await w.as(w.users.admin).post(`/api/users/${w.users.adminB.id}/deactivate`)).status, 200);
});

// ---- 3. Case-insensitive emails ---------------------------------------------
test("Emails are stored lowercase, duplicates ignoring case are refused, and login works in any case", async () => {
  const w = buildWorld();
  const a = w.as(w.users.admin);
  const body = { fullName: "Foo Bar", password: "Passw0rd!xyz", roleKey: "ADMIN" };

  const first = await a.post("/api/users").send({ ...body, email: "  Foo@Bar.COM " });
  assert.equal(first.status, 201);
  assert.equal(first.body.email, "foo@bar.com");

  const dup = await a.post("/api/users").send({ ...body, email: "foo@bar.com" });
  assert.equal(dup.status, 409);
  const dup2 = await a.post("/api/users").send({ ...body, email: "FOO@BAR.COM" });
  assert.equal(dup2.status, 409);

  // The in-memory database doesn't apply Prisma's column defaults / relations,
  // so finish the row the way the real database would.
  const stored = w.db.tables.users.find((u) => u.id === first.body.id);
  Object.assign(stored, { isActive: true, role: w.roles.ADMIN });

  for (const typed of ["foo@bar.com", "Foo@Bar.com", "FOO@BAR.COM"]) {
    const login = await w.request().post("/api/auth/login").set("X-Forwarded-For", "192.0.2.9").send({ email: typed, password: body.password });
    assert.equal(login.status, 200, `login as ${typed}`);
  }
});

test("An account stored with capital letters (created before normalising) can still sign in", async () => {
  const w = buildWorld();
  const { hashPassword } = require("../src/utils/auth");
  const legacy = w.db.tables.users.find((u) => u.id === w.users.execA1.id);
  legacy.email = "Legacy.User@Example.com";
  legacy.passwordHash = await hashPassword("Legacy-Pass-1");
  const res = await w.request().post("/api/auth/login").set("X-Forwarded-For", "192.0.2.10").send({ email: "legacy.user@example.com", password: "Legacy-Pass-1" });
  assert.equal(res.status, 200);
});

// ---- 4. CSV formula injection ---------------------------------------------
test("CSV export neutralises formula-looking values but keeps numbers and phones", () => {
  const { escapeCsvField, neutralizeFormula } = require("../src/services/export.service");
  for (const risky of ['=HYPERLINK("http://evil","x")', "@SUM(1+1)", "+cmd|' /C calc'!A0", "-1+2", "\tTAB", "=1+1"]) {
    assert.ok(neutralizeFormula(risky).startsWith("'"), `should neutralise ${JSON.stringify(risky)}`);
  }
  for (const safe of ["Acme Ltd", "+91 98765 43210", "-5", "9876543210", "(022) 1234-5678", "", "a=b"]) {
    assert.equal(neutralizeFormula(safe), safe, `should leave ${JSON.stringify(safe)}`);
  }
  assert.equal(escapeCsvField('=HYPERLINK("x","y")'), `"'=HYPERLINK(""x"",""y"")"`);
  assert.equal(escapeCsvField("plain"), "plain");
  assert.equal(escapeCsvField(null), "");
  assert.equal(escapeCsvField("two\r\nlines"), '"two\r\nlines"');
});
