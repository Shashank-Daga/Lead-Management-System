// Profile feature over HTTP: real Express routes, services, authentication and
// authorization, against the in-memory database (see helpers/memoryDb.js).
//
//   Admin A, Admin B; Managers: mgrA1 (execA1, execA2), mgrA2 (execA3), mgrB (execB)
const test = require("node:test");
const assert = require("node:assert/strict");
const argon2 = require("argon2");
const { buildWorld } = require("./helpers/world");

const OLD_PASSWORD = "OldPassw0rd!";
const NEW_PASSWORD = "NewPassw0rd!2";

async function worldWithPasswords() {
  const w = buildWorld();
  const hash = await argon2.hash(OLD_PASSWORD, { type: argon2.argon2id });
  for (const u of Object.values(w.users)) u.passwordHash = hash;
  return w;
}

const stored = (w, user) => w.db.tables.users.find((u) => u.id === user.id);
const login = (w, email, password) => w.request().post("/api/auth/login").send({ email, password });

function assertNoSecrets(body, label) {
  const text = JSON.stringify(body);
  assert.ok(!/passwordHash/i.test(text), `${label}: leaked passwordHash`);
  assert.ok(!text.includes("$argon2"), `${label}: leaked a password hash`);
  assert.ok(!/passwordChangedAt/i.test(text), `${label}: leaked passwordChangedAt`);
}

// ---- Authentication ----------------------------------------------------------------
test("Every profile endpoint requires authentication", async () => {
  const w = await worldWithPasswords();
  const someUser = w.users.execA1.id;
  for (const [method, url] of [
    ["get", "/api/profile"],
    ["patch", "/api/profile"],
    ["post", "/api/profile/password"],
    ["get", "/api/profile/users"],
    ["get", `/api/profile/users/${someUser}`],
  ]) {
    const res = await w.request()[method](url).send({});
    assert.equal(res.status, 401, `${method} ${url}`);
  }
});

// ---- Own profile -------------------------------------------------------------------
test("A user loads their own profile: work email, role, manager, no personal email, no secrets", async () => {
  const w = await worldWithPasswords();
  const res = await w.as(w.users.execA1).get("/api/profile");

  assert.equal(res.status, 200);
  assert.equal(res.body.id, w.users.execA1.id);
  assert.equal(res.body.fullName, "Exec A1");
  assert.equal(res.body.email, w.users.execA1.email);
  assert.equal(res.body.roleKey, "EXECUTIVE");
  assert.deepEqual(res.body.manager, { id: w.users.mgrA1.id, fullName: "Manager A1" });
  assert.equal(res.body.phone, null);
  assert.equal(res.body.dateOfBirth, null);
  assert.ok(!("personalEmail" in res.body), "personal email no longer exists");
  assertNoSecrets(res.body, "GET /profile");
});

// ---- Phone and date of birth ---------------------------------------------------------
test("A user updates, persists and clears their phone and date of birth", async () => {
  const w = await worldWithPasswords();
  const user = w.users.execA1;
  const c = w.as(user);

  let res = await c.patch("/api/profile").send({ phone: " 9876543210 ", dateOfBirth: "2001-05-17" });
  assert.equal(res.status, 200);
  assert.equal(res.body.phone, "9876543210", "value is trimmed");
  assert.equal(res.body.dateOfBirth, "2001-05-17");
  assert.equal(stored(w, user).phone, "9876543210");
  assert.equal(stored(w, user).email, user.email, "work email untouched");

  // Visible again after logging out and back in.
  const session = await login(w, user.email, OLD_PASSWORD);
  assert.equal(session.status, 200);
  const again = await w.request().get("/api/profile").set("Authorization", `Bearer ${session.body.accessToken}`);
  assert.equal(again.body.phone, "9876543210");
  assert.equal(again.body.dateOfBirth, "2001-05-17");

  res = await c.patch("/api/profile").send({ phone: "", dateOfBirth: "" });
  assert.equal(res.status, 200);
  assert.equal(res.body.phone, null);
  assert.equal(res.body.dateOfBirth, null);
});

test("Phone must be exactly 10 digits; bad dates of birth are rejected", async () => {
  const w = await worldWithPasswords();
  const user = w.users.execA1;
  const c = w.as(user);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  for (const body of [
    { phone: "+91 98765 43210" },
    { phone: "+919876543210" },
    { phone: "98765 43210" },
    { phone: "987654321" },
    { phone: "98765432101" },
    { phone: "abcdefghij" },
    { phone: "<script>12</script>" },
    { dateOfBirth: tomorrow },
    { dateOfBirth: "2001-02-30" },
    { dateOfBirth: "17/05/2001" },
    { dateOfBirth: "not-a-date" },
    {},
  ]) {
    const res = await c.patch("/api/profile").send(body);
    assert.equal(res.status, 422, JSON.stringify(body));
  }

  assert.equal(stored(w, user).phone, undefined, "nothing was saved by a rejected request");
  assert.equal(stored(w, user).dateOfBirth, undefined);
});

// ---- Fields a user may not change ------------------------------------------------------
test("Work email, name, role, manager, active flag and hash cannot be changed through the profile", async () => {
  const w = await worldWithPasswords();
  const user = w.users.execA1;
  const before = JSON.stringify(stored(w, user));

  for (const extra of [
    { email: "new.address@example.com" },
    { personalEmail: "me@home.example" },
    { fullName: "Renamed" },
    { roleKey: "ADMIN" },
    { roleId: w.roles.ADMIN.id },
    { managerId: null },
    { isActive: false },
    { id: w.users.admin.id },
    { userId: w.users.admin.id },
    { passwordHash: "x" },
  ]) {
    const res = await w.as(user).patch("/api/profile").send({ phone: "9876543210", ...extra });
    assert.equal(res.status, 422, JSON.stringify(extra));
  }

  assert.equal(JSON.stringify(stored(w, user)), before, "account is unchanged");
});

test("An Admin cannot edit another user's profile or password through these endpoints", async () => {
  const w = await worldWithPasswords();
  const target = w.users.execA1;
  const before = JSON.stringify(stored(w, target));
  const admin = w.as(w.users.admin);

  const attempts = [
    admin.patch("/api/profile").send({ userId: target.id, phone: "9999999999" }),
    admin.patch("/api/profile").send({ id: target.id, phone: "9999999999" }),
    admin.patch(`/api/profile/users/${target.id}`).send({ phone: "9999999999" }),
    admin.post("/api/profile/password").send({
      userId: target.id,
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    }),
    admin.post(`/api/profile/users/${target.id}/password`).send({ newPassword: NEW_PASSWORD }),
  ];
  for (const attempt of attempts) assert.ok([404, 422].includes((await attempt).status));

  assert.equal(JSON.stringify(stored(w, target)), before);
});

// ---- Password ---------------------------------------------------------------------------
test("Password change: stored only as an Argon2 hash; the new password works and the old one does not", async () => {
  const w = await worldWithPasswords();
  const user = w.users.execA1;

  const res = await w.as(user).post("/api/profile/password").send({
    currentPassword: OLD_PASSWORD,
    newPassword: NEW_PASSWORD,
    confirmPassword: NEW_PASSWORD,
  });
  assert.equal(res.status, 200);
  assert.ok(res.body.accessToken && res.body.refreshToken);
  assertNoSecrets({ ...res.body, accessToken: undefined, refreshToken: undefined }, "POST /profile/password");

  const hash = stored(w, user).passwordHash;
  assert.ok(hash.startsWith("$argon2id$"), "stored value is an Argon2id hash");
  assert.ok(!hash.includes(NEW_PASSWORD));
  assert.equal(await argon2.verify(hash, NEW_PASSWORD), true);

  assert.equal((await login(w, user.email, NEW_PASSWORD)).status, 200);
  assert.equal((await login(w, user.email, OLD_PASSWORD)).status, 401);
});

test("Password change rejects a wrong current password, mismatch, short, unchanged and unknown fields", async () => {
  const w = await worldWithPasswords();
  const user = w.users.execA1;
  const c = w.as(user);
  const before = stored(w, user).passwordHash;

  const cases = [
    [{ currentPassword: "nope-nope", newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }, "currentPassword"],
    [{ currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: `${NEW_PASSWORD}x` }, "confirmPassword"],
    [{ currentPassword: OLD_PASSWORD, newPassword: "short1", confirmPassword: "short1" }, "newPassword"],
    [{ currentPassword: OLD_PASSWORD, newPassword: OLD_PASSWORD, confirmPassword: OLD_PASSWORD }, "newPassword"],
    [{ newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD }, "currentPassword"],
    [{ currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD, userId: w.users.execA2.id }, null],
  ];

  for (const [body, field] of cases) {
    const res = await c.post("/api/profile/password").send(body);
    assert.equal(res.status, 422, `wrong status for ${JSON.stringify(Object.keys(body))}`);
    if (field) assert.ok(res.body.error.details.some((d) => d.path[0] === field), `expected an error on ${field}`);
  }

  assert.equal(stored(w, user).passwordHash, before, "password unchanged after every rejection");
});

test("After a password change older sessions end and the new tokens keep working", async () => {
  const w = await worldWithPasswords();
  const user = w.users.execA1;
  const first = await login(w, user.email, OLD_PASSWORD);
  assert.equal(first.status, 200);

  // JWT `iat` is whole seconds: let the first session become clearly older.
  await new Promise((resolve) => setTimeout(resolve, 1100));

  const changed = await w
    .request()
    .post("/api/profile/password")
    .set("Authorization", `Bearer ${first.body.accessToken}`)
    .send({ currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD, confirmPassword: NEW_PASSWORD });
  assert.equal(changed.status, 200);

  const me = (token) => w.request().get("/api/auth/me").set("Authorization", `Bearer ${token}`);
  const refresh = (token) => w.request().post("/api/auth/refresh").send({ refreshToken: token });

  assert.equal((await me(first.body.accessToken)).status, 401, "old access token is refused");
  assert.equal((await refresh(first.body.refreshToken)).status, 401, "old refresh token is refused");
  assert.equal((await me(changed.body.accessToken)).status, 200, "new access token works");
  assert.equal((await refresh(changed.body.refreshToken)).status, 200, "new refresh token works");
});

test("Without a password change, login and refresh behave as before", async () => {
  const w = await worldWithPasswords();
  const session = await login(w, w.users.mgrA1.email, OLD_PASSWORD);
  assert.equal(session.status, 200);
  const refreshed = await w.request().post("/api/auth/refresh").send({ refreshToken: session.body.refreshToken });
  assert.equal(refreshed.status, 200);
});

// ---- Read-only visibility ---------------------------------------------------------------
test("Admin can view the basic profile of every user", async () => {
  const w = await worldWithPasswords();
  const admin = w.as(w.users.admin);
  stored(w, w.users.execB).phone = "9000000001";
  stored(w, w.users.execB).dateOfBirth = new Date("1990-02-03T00:00:00.000Z");

  const list = await admin.get("/api/profile/users");
  assert.equal(list.status, 200);
  assert.equal(list.body.length, Object.keys(w.users).length);
  assertNoSecrets(list.body, "admin list");

  const one = await admin.get(`/api/profile/users/${w.users.execB.id}`);
  assert.equal(one.status, 200);
  assert.deepEqual(
    Object.keys(one.body).sort(),
    ["dateOfBirth", "email", "fullName", "id", "isActive", "manager", "phone", "roleKey", "roleName"]
  );
  assert.equal(one.body.phone, "9000000001");
  assert.equal(one.body.dateOfBirth, "1990-02-03");
  assertNoSecrets(one.body, "admin single");

  assert.equal((await admin.get("/api/profile/users/00000000-0000-4000-8000-000000000000")).status, 404);
  assert.equal((await admin.get("/api/profile/users/not-a-uuid")).status, 422);
});

test("A Manager sees their own team's profiles and nobody else's", async () => {
  const w = await worldWithPasswords();
  const mgr = w.as(w.users.mgrA1);

  const list = await mgr.get("/api/profile/users");
  assert.equal(list.status, 200);
  assert.deepEqual(
    list.body.map((p) => p.id).sort(),
    [w.users.mgrA1.id, w.users.execA1.id, w.users.execA2.id].sort()
  );
  assertNoSecrets(list.body, "manager list");

  assert.equal((await mgr.get(`/api/profile/users/${w.users.execA1.id}`)).status, 200);
  for (const outsider of [w.users.execA3, w.users.mgrA2, w.users.execB, w.users.mgrB, w.users.admin, w.users.adminB]) {
    assert.equal((await mgr.get(`/api/profile/users/${outsider.id}`)).status, 404, outsider.fullName);
  }
});

test("A Manager no longer sees a deactivated report", async () => {
  const w = await worldWithPasswords();
  stored(w, w.users.execA2).isActive = false;
  const list = await w.as(w.users.mgrA1).get("/api/profile/users");
  assert.ok(!list.body.some((p) => p.id === w.users.execA2.id));
});

test("An Executive can only ever see their own profile", async () => {
  const w = await worldWithPasswords();
  const exec = w.as(w.users.execA1);

  const list = await exec.get("/api/profile/users");
  assert.equal(list.status, 200);
  assert.deepEqual(list.body.map((p) => p.id), [w.users.execA1.id]);

  assert.equal((await exec.get(`/api/profile/users/${w.users.execA1.id}`)).status, 200);
  for (const other of [w.users.execA2, w.users.mgrA1, w.users.admin, w.users.execB]) {
    assert.equal((await exec.get(`/api/profile/users/${other.id}`)).status, 404, other.fullName);
  }
});

// ---- Existing behaviour -------------------------------------------------------------------
test("Existing user management and lead access are unaffected", async () => {
  const w = await worldWithPasswords();
  assert.equal((await w.as(w.users.admin).get("/api/users")).status, 200);
  assert.equal((await w.as(w.users.mgrA1).get("/api/users")).status, 403);
  assert.equal((await w.as(w.users.execA1).get("/api/users")).status, 403);
  assert.equal((await w.as(w.users.execA1).get("/api/dashboard")).status, 200);
  assert.equal((await w.as(w.users.execA1).get("/api/leads")).status, 200);
});
