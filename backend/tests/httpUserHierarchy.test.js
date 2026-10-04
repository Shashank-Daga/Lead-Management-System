// User and hierarchy rules over HTTP: who can be whose manager, notifications on
// assignment, atomic manager deactivation, and role/team-based user access.
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildWorld, id } = require("./helpers/world");

const newUser = (over = {}) => ({
  fullName: "New Person",
  email: `p${Math.random().toString(36).slice(2)}@example.com`,
  password: "Str0ng-Passw0rd!",
  roleKey: "EXECUTIVE",
  ...over,
});
const unreadFor = (w, user) => w.db.tables.notification.filter((n) => n.userId === user.id);

test("Admin creates a Manager (no manager id)", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.admin).post("/api/users").send(newUser({ roleKey: "MANAGER" }));
  assert.equal(res.status, 201);
  assert.ok(!("passwordHash" in res.body));
});

test("Admin creates an Executive under a valid Manager; the Manager is notified", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.admin).post("/api/users").send(newUser({ managerId: w.users.mgrA1.id }));
  assert.equal(res.status, 201);
  const notes = unreadFor(w, w.users.mgrA1);
  assert.equal(notes.length, 1);
  assert.equal(notes[0].type, "EXECUTIVE_ASSIGNED");
  assert.equal(unreadFor(w, w.users.mgrA2).length, 0, "other managers are not notified");
  assert.match(notes[0].id, /^[0-9a-f-]{36}$/, "returned/persisted id is the real row id");
});

test("Hierarchy: invalid manager id is rejected", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.admin).post("/api/users").send(newUser({ managerId: id() }));
  assert.equal(res.status, 422);
});

test("Hierarchy: an inactive Manager cannot be assigned", async () => {
  const w = buildWorld();
  w.users.mgrA2.isActive = false;
  const res = await w.as(w.users.admin).post("/api/users").send(newUser({ managerId: w.users.mgrA2.id }));
  assert.equal(res.status, 422);
});

test("Hierarchy: an active Manager can be assigned", async () => {
  const w = buildWorld();

  const res = await w
    .as(w.users.admin)
    .post("/api/users")
    .send(newUser({ managerId: w.users.mgrB.id }));

  assert.equal(res.status, 201);
  assert.equal(
    w.db.tables.users.find((u) => u.id === res.body.id).managerId,
    w.users.mgrB.id
  );
  assert.equal(unreadFor(w, w.users.mgrB).length, 1);
});

test("Hierarchy: Executive cannot report to an Executive; Admin cannot be a manager", async () => {
  const w = buildWorld();
  assert.equal((await w.as(w.users.admin).post("/api/users").send(newUser({ managerId: w.users.execA1.id }))).status, 422);
  assert.equal((await w.as(w.users.admin).post("/api/users").send(newUser({ managerId: w.users.admin.id }))).status, 422);
});

test("Hierarchy: Manager or Admin with a managerId is rejected; Executive without one is rejected", async () => {
  const w = buildWorld();
  const c = w.as(w.users.admin);
  assert.equal((await c.post("/api/users").send(newUser({ roleKey: "MANAGER", managerId: w.users.mgrA1.id }))).status, 422);
  assert.equal((await c.post("/api/users").send(newUser({ roleKey: "ADMIN", managerId: w.users.mgrA1.id }))).status, 422);
  assert.equal((await c.post("/api/users").send(newUser({ roleKey: "EXECUTIVE" }))).status, 422);
});

test("Hierarchy: reassigning an Executive notifies the NEW manager only, and not when unchanged", async () => {
  const w = buildWorld();
  const c = w.as(w.users.admin);
  const url = `/api/users/${w.users.execA1.id}`;
  const moved = await c.patch(url).send({ managerId: w.users.mgrA2.id });
  assert.equal(moved.status, 200);
  assert.equal(w.db.tables.users.find((u) => u.id === w.users.execA1.id).managerId, w.users.mgrA2.id);
  assert.equal(unreadFor(w, w.users.mgrA2).length, 1);
  assert.equal(unreadFor(w, w.users.mgrA1).length, 0);
  // Same manager again: no additional notification.
  await c.patch(url).send({ managerId: w.users.mgrA2.id });
  assert.equal(unreadFor(w, w.users.mgrA2).length, 1);
  // Renaming without touching the manager: no notification either.
  await c.patch(url).send({ fullName: "Renamed Exec" });
  assert.equal(unreadFor(w, w.users.mgrA2).length, 1);
});

test("Hierarchy: reassigning to another Manager is allowed; assigning to an Executive is rejected", async () => {
  const w = buildWorld();
  const url = `/api/users/${w.users.execA1.id}`;

  assert.equal(
    (await w.as(w.users.admin).patch(url).send({ managerId: w.users.mgrB.id })).status,
    200
  );

  assert.equal(
    w.db.tables.users.find((u) => u.id === w.users.execA1.id).managerId,
    w.users.mgrB.id
  );

  assert.equal(
    (await w.as(w.users.admin).patch(url).send({ managerId: w.users.execA2.id })).status,
    422
  );

  assert.equal(
    w.db.tables.users.find((u) => u.id === w.users.execA1.id).managerId,
    w.users.mgrB.id
  );
});

test("Manager deactivation releases active Executives to Admin ownership and keeps history", async () => {
  const w = buildWorld();
  const leadsBefore = JSON.stringify(w.db.tables.lead);
  const res = await w.as(w.users.admin).post(`/api/users/${w.users.mgrA1.id}/deactivate`);
  assert.equal(res.status, 200);
  assert.equal(res.body.isActive, false);
  const row = (u) => w.db.tables.users.find((x) => x.id === u.id);
  assert.equal(row(w.users.mgrA1).isActive, false);
  assert.equal(row(w.users.execA1).managerId, null);
  assert.equal(row(w.users.execA2).managerId, null);
  assert.equal(row(w.users.execA3).managerId, w.users.mgrA2.id, "other teams untouched");
  assert.equal(JSON.stringify(w.db.tables.lead), leadsBefore, "lead / assignment data preserved");
});

test("Manager deactivation via PATCH isActive=false behaves identically", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.admin).patch(`/api/users/${w.users.mgrA1.id}`).send({ isActive: false });
  assert.equal(res.status, 200);
  assert.equal(w.db.tables.users.find((u) => u.id === w.users.execA1.id).managerId, null);
});

test("Manager deactivation rolls back completely if any step fails", async () => {
  const w = buildWorld();
  w.db.users.update = async () => { throw new Error("injected failure"); };
  const res = await w.as(w.users.admin).post(`/api/users/${w.users.mgrA1.id}/deactivate`);
  assert.equal(res.status, 500);
  const row = (u) => w.db.tables.users.find((x) => x.id === u.id);
  assert.equal(row(w.users.mgrA1).isActive, true, "manager still active");
  assert.equal(row(w.users.execA1).managerId, w.users.mgrA1.id, "executives NOT released");
  assert.equal(row(w.users.execA2).managerId, w.users.mgrA1.id);
});

test("Users API: only Admin can list/create/manage users", async () => {
  const w = buildWorld();

  for (const u of [w.users.mgrA1, w.users.execA1]) {
    assert.equal((await w.as(u).get("/api/users")).status, 403);
    assert.equal(
      (await w.as(u).post("/api/users").send(newUser({ roleKey: "MANAGER" }))).status,
      403
    );
  }

  const list = await w.as(w.users.admin).get("/api/users");

  assert.equal(list.status, 200);
  assert.ok(list.body.length > 0);

  assert.ok(
    list.body.some((u) => u.id === w.users.mgrB.id),
    "Admin can see Managers across the single organization"
  );

  assert.equal(
    (await w.as(w.users.admin).patch(`/api/users/${w.users.execB.id}`).send({ fullName: "HACKED" })).status,
    200
  );

  assert.equal(
    (await w.as(w.users.admin).post(`/api/users/${w.users.execB.id}/deactivate`)).status,
    200
  );

  assert.equal(
    w.db.tables.users.find((u) => u.id === w.users.execB.id).isActive,
    false
  );
});

test("Assignable users: manager sees self + own team; executive sees none", async () => {
  const w = buildWorld();
  const mgr = await w.as(w.users.mgrA1).get("/api/users/assignable");
  assert.equal(mgr.status, 200);
  assert.deepEqual(
    mgr.body.map((u) => u.id).sort(),
    [w.users.mgrA1.id, w.users.execA1.id, w.users.execA2.id].sort()
  );
  const exec = await w.as(w.users.execA1).get("/api/users/assignable");
  assert.ok(exec.status === 403 || exec.body.length === 0);
});
