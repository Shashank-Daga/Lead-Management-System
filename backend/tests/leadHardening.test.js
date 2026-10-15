// Regression tests for: manager-creator loophole, dashboard clutter from lost
// leads, status-reopen data, and no-op reassignment.
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildWorld } = require("./helpers/world");

const row = (w, lead) => w.db.tables.lead.find((l) => l.id === lead.id);
const overdueIds = (body) => (body.overdueFollowUps || []).map((f) => f.lead?.id);

// ---- Manager who created a lead that has since moved to another team ---------
function movedAwayWorld() {
  const w = buildWorld();
  // leadA3 belongs to execA3 (manager A2's team) but was created by manager A1.
  row(w, w.leads.leadA3).createdById = w.users.mgrA1.id;
  return w;
}

test("Creator manager can still VIEW a lead that moved to another team", async () => {
  const w = movedAwayWorld();
  const res = await w.as(w.users.mgrA1).get(`/api/leads/${w.leads.leadA3.id}`);
  assert.equal(res.status, 200);
});

test("Creator manager cannot reassign, edit, re-prioritise, change status or follow up on it", async () => {
  const w = movedAwayWorld();
  const lead = w.leads.leadA3;
  const L = `/api/leads/${lead.id}`;
  const m = w.as(w.users.mgrA1);
  const before = JSON.stringify(row(w, lead));

  assert.equal((await m.post(`${L}/assign`).send({ userId: w.users.execA1.id })).status, 403);
  assert.equal((await m.patch(L).send({ clientName: "mine now" })).status, 403);
  assert.equal((await m.post(`${L}/priority`).send({ priority: "URGENT" })).status, 403);
  assert.equal((await m.post(`${L}/status`).send({ status: "CONTACTED" })).status, 403);
  assert.equal((await m.post(`${L}/follow-ups`).send({ dueAt: new Date().toISOString() })).status, 403);
  assert.equal(JSON.stringify(row(w, lead)), before);
  assert.equal(w.db.tables.assignmentHistory.length, 0);
});

test("The lead's current manager (and Admin) still can reassign it", async () => {
  const w = movedAwayWorld();
  const lead = w.leads.leadA3;
  const byOwner = await w.as(w.users.mgrA2).post(`/api/leads/${lead.id}/assign`).send({ userId: w.users.mgrA2.id });
  assert.equal(byOwner.status, 200);
  const byAdmin = await w.as(w.users.admin).post(`/api/leads/${lead.id}/assign`).send({ userId: w.users.execA3.id });
  assert.equal(byAdmin.status, 200);
});

test("A manager keeps full control of an UNASSIGNED lead they created, and of their team's leads", async () => {
  const w = buildWorld();
  const created = await w.as(w.users.mgrA1).post("/api/leads").send({
    clientName: "Fresh", contactPerson: "P", phone: "9999999999", source: "web",
  });
  assert.equal(created.status, 201);
  const L = `/api/leads/${created.body.id}`;
  assert.equal((await w.as(w.users.mgrA1).patch(L).send({ clientName: "Fresh 2" })).status, 200);
  assert.equal((await w.as(w.users.mgrA1).post(`${L}/assign`).send({ userId: w.users.execA1.id })).status, 200);
  // now owned by their team -> still fine
  assert.equal((await w.as(w.users.mgrA1).patch(L).send({ clientName: "Fresh 3" })).status, 200);
  // Admin reassigns it to another team -> creator loses edit rights
  assert.equal((await w.as(w.users.admin).post(`${L}/assign`).send({ userId: w.users.execA3.id })).status, 200);
  assert.equal((await w.as(w.users.mgrA1).patch(L).send({ clientName: "Fresh 4" })).status, 403);
});

// ---- Dashboard follow-ups ---------------------------------------------------
for (const closed of ["LOST", "CONVERTED"]) {
  test(`Dashboard: pending follow-ups of ${closed} leads are not overdue/upcoming/due-today; the lead tab still lists them`, async () => {
    const w = buildWorld();
    const lead = w.leads.leadA1;
    const admin = w.as(w.users.admin);

    const before = await admin.get("/api/dashboard");
    assert.ok(overdueIds(before.body).includes(lead.id), "precondition: overdue while the lead is open");
    assert.ok((before.body.upcomingFollowUps || []).some((f) => f.lead?.id === lead.id), "precondition: upcoming while open");

    row(w, lead).status = closed;
    const after = await admin.get("/api/dashboard");
    assert.ok(!overdueIds(after.body).includes(lead.id), "hidden from overdue");
    assert.ok(!(after.body.upcomingFollowUps || []).some((f) => f.lead?.id === lead.id), "hidden from upcoming");
    assert.ok(after.body.dueTodayCount <= before.body.dueTodayCount);

    const tab = await admin.get(`/api/leads/${lead.id}/follow-ups`);
    assert.equal(tab.status, 200);
    assert.ok(tab.body.length >= 1, "lead tab still lists its follow-ups");

    // Executive's own dashboard behaves the same
    const exec = await w.as(w.users.execA1).get("/api/dashboard");
    assert.ok(!overdueIds(exec.body).includes(lead.id));
  });
}

test("Dashboard: due-today count drops closed leads' follow-ups", async () => {
  const w = buildWorld();
  const lead = w.leads.leadA1;
  const todayNoon = new Date(); todayNoon.setHours(23, 0, 0, 0);
  if (todayNoon < new Date()) todayNoon.setTime(Date.now() + 60 * 1000);
  w.addFollowUp(lead, w.users.execA1, todayNoon);
  const admin = w.as(w.users.admin);
  const open = (await admin.get("/api/dashboard")).body.dueTodayCount;
  row(w, lead).status = "CONVERTED";
  const closed = (await admin.get("/api/dashboard")).body.dueTodayCount;
  assert.equal(closed, open - 1);
});

// ---- Reopening --------------------------------------------------------------
test("Reopening keeps the loss reason but clears the conversion date", async () => {
  const w = buildWorld();
  const lead = w.leads.leadA1;
  const a = w.as(w.users.admin);

  await a.post(`/api/leads/${lead.id}/status`).send({ status: "LOST", lossReason: "Too pricey" });
  await a.post(`/api/leads/${lead.id}/status`).send({ status: "CONTACTED" });
  assert.equal(row(w, lead).lossReason, "Too pricey", "loss reason explains the last attempt");

  await a.post(`/api/leads/${lead.id}/status`).send({ status: "CONVERTED" });
  assert.ok(row(w, lead).conversionDate, "set on conversion");
  await a.post(`/api/leads/${lead.id}/status`).send({ status: "CONTACTED" });
  assert.equal(row(w, lead).conversionDate, null, "cleared when reopened");
  assert.equal(row(w, lead).lossReason, "Too pricey");
});

// ---- Same-assignee --------------------------------------------------------
test("Assigning a lead to its current assignee is refused and records nothing", async () => {
  const w = buildWorld();
  const lead = w.leads.leadA1;
  const res = await w.as(w.users.admin).post(`/api/leads/${lead.id}/assign`).send({ userId: w.users.execA1.id });
  assert.equal(res.status, 422);
  assert.match(res.body.error.message, /already assigned/i);
  assert.equal(w.db.tables.assignmentHistory.length, 0);
  assert.equal(w.db.tables.notification.filter((n) => n.type === "LEAD_ASSIGNED").length, 0);
});
