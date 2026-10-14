// A LOST lead is closed out: it must not be assigned or reassigned (by anyone)
// until it is reopened through a status change.
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildWorld } = require("./helpers/world");

const assignUrl = (lead) => `/api/leads/${lead.id}/assign`;
const row = (w, lead) => w.db.tables.lead.find((l) => l.id === lead.id);

function lostWorld() {
  const w = buildWorld();
  row(w, w.leads.leadA1).status = "LOST";
  return w;
}

test("Lost lead: Admin cannot reassign it, and nothing changes", async () => {
  const w = lostWorld();
  const lead = w.leads.leadA1;
  const before = JSON.stringify(row(w, lead));
  const res = await w.as(w.users.admin).post(assignUrl(lead)).send({ userId: w.users.execA2.id, reason: "x" });

  assert.equal(res.status, 422);
  assert.match(res.body.error.message, /lost lead cannot be assigned or reassigned/i);
  assert.equal(JSON.stringify(row(w, lead)), before);
  assert.equal(w.db.tables.assignmentHistory.length, 0);
  assert.ok(!w.db.tables.notification.some((n) => n.type === "LEAD_ASSIGNED"));
});

test("Lost lead: Manager cannot reassign it within their own team either", async () => {
  const w = lostWorld();
  const res = await w.as(w.users.mgrA1).post(assignUrl(w.leads.leadA1)).send({ userId: w.users.execA2.id });
  assert.equal(res.status, 422);
  assert.equal(row(w, w.leads.leadA1).currentAssigneeId, w.users.execA1.id);
});

test("Lost lead: an unassigned lost lead cannot be assigned", async () => {
  const w = lostWorld();
  row(w, w.leads.leadA1).currentAssigneeId = null;
  const res = await w.as(w.users.admin).post(assignUrl(w.leads.leadA1)).send({ userId: w.users.execA2.id });
  assert.equal(res.status, 422);
  assert.equal(row(w, w.leads.leadA1).currentAssigneeId, null);
});

test("Lost lead: can be assigned again once reopened via a status change", async () => {
  const w = lostWorld();
  const lead = w.leads.leadA1;
  const reopen = await w.as(w.users.admin).post(`/api/leads/${lead.id}/status`).send({ status: "CONTACTED" });
  assert.equal(reopen.status, 200);

  const res = await w.as(w.users.admin).post(assignUrl(lead)).send({ userId: w.users.execA2.id });
  assert.equal(res.status, 200);
  assert.equal(row(w, lead).currentAssigneeId, w.users.execA2.id);
});

test("Converted lead: cannot be assigned or reassigned, by Admin or Manager", async () => {
  for (const actor of ["admin", "mgrA1"]) {
    const w = buildWorld();
    const lead = w.leads.leadA1;
    row(w, lead).status = "CONVERTED";
    const res = await w.as(w.users[actor]).post(assignUrl(lead)).send({ userId: w.users.execA2.id });
    assert.equal(res.status, 422, actor);
    assert.match(res.body.error.message, /converted lead cannot be assigned or reassigned/i);
    assert.equal(row(w, lead).currentAssigneeId, w.users.execA1.id);
    assert.equal(w.db.tables.assignmentHistory.length, 0);
  }
});

test("Converted lead: can be assigned again once reopened via a status change", async () => {
  const w = buildWorld();
  const lead = w.leads.leadA1;
  row(w, lead).status = "CONVERTED";
  assert.equal((await w.as(w.users.admin).post(`/api/leads/${lead.id}/status`).send({ status: "NEGOTIATION" })).status, 200);
  assert.equal((await w.as(w.users.admin).post(assignUrl(lead)).send({ userId: w.users.execA2.id })).status, 200);
});

test("Open statuses (including ON_HOLD) stay assignable", async () => {
  for (const status of ["NEW", "QUALIFIED", "ON_HOLD"]) {
    const w = buildWorld();
    row(w, w.leads.leadA1).status = status;
    const res = await w.as(w.users.admin).post(assignUrl(w.leads.leadA1)).send({ userId: w.users.execA2.id });
    assert.equal(res.status, 200, `${status} should stay assignable`);
  }
});
