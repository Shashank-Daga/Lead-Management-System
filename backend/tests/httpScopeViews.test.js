// What each role SEES: executive/manager/admin dashboards, CSV export scope, and
// notification privacy — over HTTP, with real services.
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildWorld, id } = require("./helpers/world");

// ---- Dashboard ------------------------------------------------------------------
test("Executive dashboard: reachable, scoped to 'own', shows only their numbers", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.execA1).get("/api/dashboard");
  assert.equal(res.status, 200, "executives must be able to open their dashboard");
  const d = res.body;
  assert.equal(d.scope, "own");
  assert.equal(d.totalLeads, 3);      // LD-1 (NEW), Won, Lost
  assert.equal(d.openLeads, 1);       // "how many leads are pending"
  assert.equal(d.newLeads, 1);        // "any new lead assigned"
  assert.equal(d.convertedCount, 1);
  assert.equal(d.lostCount, 1);
  assert.equal(d.resolvedCount, 2);   // "leads resolved"
  assert.equal(d.conversionRate, 50);
  assert.deepEqual(d.recentlyAssigned.map((l) => l.leadCode), ["LD-000001"]);
  assert.equal(d.overdueFollowUps.length, 1);
  assert.equal(d.overdueFollowUps[0].id, w.followUps.fuA1.id);
  assert.equal(d.upcomingFollowUps.length, 1);
  assert.equal(d.upcomingFollowUps[0].id, w.followUps.fuA1Upcoming.id);
  assert.ok(Number.isInteger(d.dueTodayCount));
});

test("Executive dashboard never includes a peer's leads/follow-ups", async () => {
  const w = buildWorld();
  const d = (await w.as(w.users.execA1).get("/api/dashboard")).body;
  const text = JSON.stringify(d);
  for (const secret of ["LD-000002", "LD-000003", w.followUps.fuA2.id, w.followUps.fuA3.id, w.followUps.fuB1.id]) {
    assert.ok(!text.includes(secret), `dashboard leaked ${secret}`);
  }
});

test("Another executive gets their own, different numbers", async () => {
  const w = buildWorld();
  const d = (await w.as(w.users.execA2).get("/api/dashboard")).body;
  assert.equal(d.totalLeads, 1);
  assert.equal(d.overdueFollowUps[0].id, w.followUps.fuA2.id);
});

test("Manager dashboard: scope 'team'; Admin dashboard: scope 'organization'", async () => {
  const w = buildWorld();
  const m = (await w.as(w.users.mgrA1).get("/api/dashboard")).body;
  assert.equal(m.scope, "team");
  const mText = JSON.stringify(m);
  assert.ok(mText.includes(w.followUps.fuA2.id) && !mText.includes(w.followUps.fuA3.id));

  const a = (await w.as(w.users.admin).get("/api/dashboard")).body;
  assert.equal(a.scope, "organization");
  assert.equal(a.totalLeads, w.db.tables.lead.length);
  const ids = a.overdueFollowUps.map((f) => f.id).sort();
  assert.deepEqual(
    ids,
    [
      w.followUps.fuA1.id,
      w.followUps.fuA2.id,
      w.followUps.fuA3.id,
      w.followUps.fuB1.id,
    ].sort(),
    "Admin sees every user's overdue follow-up in the organization"
  );
});

test("Dashboard requires authentication", async () => {
  const w = buildWorld();
  assert.equal((await w.request().get("/api/dashboard")).status, 401);
});

// ---- CSV export -------------------------------------------------------------------
const csvCodes = (res) => res.text.split("\n").slice(1).map((l) => l.split(",")[0]).filter(Boolean).sort();

test("CSV: Admin exports all leads", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.admin).get("/api/dashboard/export/leads.csv");

  assert.equal(res.status, 200);
  assert.match(res.headers["content-type"], /text\/csv/);

  const codes = csvCodes(res);

  assert.deepEqual(
    codes,
    w.db.tables.lead.map((l) => l.leadCode).sort()
  );
});

test("CSV: Manager exports own/team leads only", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.mgrA1).get("/api/dashboard/export/leads.csv");
  assert.equal(res.status, 200);
  const codes = csvCodes(res);
  assert.ok(codes.includes("LD-000001") && codes.includes("LD-000002"));
  assert.ok(!codes.includes("LD-000003"), "other manager's team excluded");
});

test("CSV: Executive has no export permission (403); anonymous is 401", async () => {
  const w = buildWorld();

  assert.equal(
    (await w.as(w.users.execA1).get("/api/dashboard/export/leads.csv")).status,
    403
  );

  assert.equal(
    (await w.request().get("/api/dashboard/export/leads.csv")).status,
    401
  );
});

// ---- Notifications ------------------------------------------------------------------
test("Notifications: users see and read only their own", async () => {
  const w = buildWorld();
  const mine = { id: id(), userId: w.users.mgrA1.id, type: "T", title: "mine", message: "m", isRead: false, metadata: {}, createdAt: new Date() };
  const theirs = { id: id(), userId: w.users.execA1.id, type: "T", title: "theirs", message: "m", isRead: false, metadata: {}, createdAt: new Date() };
  const otherUser = { id: id(), userId: w.users.mgrB.id, type: "T", title: "other user", message: "m", isRead: false, metadata: {}, createdAt: new Date() };
  w.db.tables.notification.push(mine, theirs, otherUser);

  const list = await w.as(w.users.mgrA1).get("/api/notifications");
  assert.deepEqual(list.body.map((n) => n.id), [mine.id]);

  assert.equal((await w.as(w.users.mgrA1).post(`/api/notifications/${theirs.id}/read`)).status, 404);
  assert.equal((await w.as(w.users.mgrA1).post(`/api/notifications/${otherUser.id}/read`)).status, 404);
  assert.equal(w.db.tables.notification.find((n) => n.id === theirs.id).isRead, false);

  const ok = await w.as(w.users.mgrA1).post(`/api/notifications/${mine.id}/read`);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.isRead, true);
  assert.equal((await w.request().get("/api/notifications")).status, 401);
});
