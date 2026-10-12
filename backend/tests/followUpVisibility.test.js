// Follow-up visibility follows the lead's CURRENT assignee and the reporting
// hierarchy, never the follow-up's creator. Exercised over HTTP with the real
// routes, services and authorization, against the in-memory database.
//
//   Admin A, Admin B; Managers: mgrA1 (execA1, execA2), mgrA2 (execA3), mgrB (execB)
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildWorld } = require("./helpers/world");

const HOUR = 3600 * 1000;
const past = () => new Date(Date.now() - 24 * HOUR);
const future = () => new Date(Date.now() + 48 * HOUR);

const ids = (list) => list.map((f) => f.id).sort();

async function dashboard(w, user) {
  const res = await w.as(user).get("/api/dashboard");
  assert.equal(res.status, 200);
  return res.body;
}

async function overdueIds(w, user) {
  return ids((await dashboard(w, user)).overdueFollowUps);
}

async function upcomingIds(w, user) {
  return ids((await dashboard(w, user)).upcomingFollowUps);
}

async function leadTabIds(w, user, lead) {
  const res = await w.as(user).get(`/api/leads/${lead.id}/follow-ups`);
  assert.equal(res.status, 200);
  return ids(res.body);
}

// ---- Baseline rules by role ------------------------------------------------
test("Admin sees every follow-up in the organization", async () => {
  const w = buildWorld();
  const f = w.followUps;
  assert.deepEqual(
    await overdueIds(w, w.users.admin),
    ids([f.fuA1, f.fuA2, f.fuA3, f.fuB1])
  );
  assert.deepEqual(await overdueIds(w, w.users.adminB), await overdueIds(w, w.users.admin));
});

test("Executive sees their own follow-ups and never another executive's", async () => {
  const w = buildWorld();
  const f = w.followUps;
  assert.deepEqual(await overdueIds(w, w.users.execA1), [f.fuA1.id]);
  assert.deepEqual(await upcomingIds(w, w.users.execA1), [f.fuA1Upcoming.id]);
  assert.deepEqual(await overdueIds(w, w.users.execA2), [f.fuA2.id]);
  const text = JSON.stringify(await dashboard(w, w.users.execA1));
  for (const secret of [f.fuA2.id, f.fuA3.id, f.fuB1.id]) assert.ok(!text.includes(secret));
});

test("Manager sees own and direct reports' follow-ups, not an unrelated team's", async () => {
  const w = buildWorld();
  const f = w.followUps;
  // Manager-owned follow-up on a lead assigned to the manager.
  const leadOwn = w.addLead("LD-000900", "Mgr Own", w.users.mgrA1, w.users.mgrA1);
  const fuOwn = w.addFollowUp(leadOwn, w.users.mgrA1, past());

  assert.deepEqual(await overdueIds(w, w.users.mgrA1), ids([f.fuA1, f.fuA2, fuOwn]));
  // Another manager's team (mgrA2 -> execA3) and a different org branch stay hidden.
  assert.deepEqual(await overdueIds(w, w.users.mgrA2), [f.fuA3.id]);
  const text = JSON.stringify(await dashboard(w, w.users.mgrA1));
  assert.ok(!text.includes(f.fuA3.id) && !text.includes(f.fuB1.id));
});

// ---- Admin-created follow-ups (the reported bug) ---------------------------
test("Admin-created follow-up on an Executive's lead is visible to the Executive, their Manager and Admin", async () => {
  const w = buildWorld();
  const adminFu = w.addFollowUp(w.leads.leadA1, w.users.admin, past());

  assert.ok((await overdueIds(w, w.users.execA1)).includes(adminFu.id), "assigned Executive");
  assert.ok((await overdueIds(w, w.users.mgrA1)).includes(adminFu.id), "Executive's Manager");
  assert.ok((await overdueIds(w, w.users.admin)).includes(adminFu.id), "Admin");

  for (const outsider of [w.users.execA2, w.users.execA3, w.users.mgrA2, w.users.mgrB, w.users.execB]) {
    assert.ok(!(await overdueIds(w, outsider)).includes(adminFu.id), `${outsider.fullName} must not see it`);
  }

  // Lead tab agrees with the dashboard and reports the assignee as owner.
  const tab = await w.as(w.users.execA1).get(`/api/leads/${w.leads.leadA1.id}/follow-ups`);
  const row = tab.body.find((x) => x.id === adminFu.id);
  assert.ok(row);
  assert.equal(row.owner.id, w.users.execA1.id);
  assert.equal(row.lead, undefined, "internal lead join must not leak into the response");
});

test("Admin-created follow-up on a Manager's lead is visible to that Manager and Admin only", async () => {
  const w = buildWorld();
  const lead = w.addLead("LD-000901", "Mgr lead", w.users.mgrA1, w.users.admin);
  const adminFu = w.addFollowUp(lead, w.users.admin, past());

  assert.ok((await overdueIds(w, w.users.mgrA1)).includes(adminFu.id));
  assert.ok((await overdueIds(w, w.users.admin)).includes(adminFu.id));
  for (const other of [w.users.mgrA2, w.users.mgrB, w.users.execA1, w.users.execA2, w.users.execA3]) {
    assert.ok(!(await overdueIds(w, other)).includes(adminFu.id), `${other.fullName} must not see it`);
  }
});

test("Follow-up created through the API by an Admin lands with the assignee", async () => {
  const w = buildWorld();
  const res = await w
    .as(w.users.admin)
    .post(`/api/leads/${w.leads.leadA2.id}/follow-ups`)
    .send({ dueAt: past().toISOString(), notes: "call back" });
  assert.equal(res.status, 201);
  assert.equal(res.body.ownerId, w.users.admin.id, "creator is still recorded");

  assert.ok((await overdueIds(w, w.users.execA2)).includes(res.body.id));
  assert.ok((await overdueIds(w, w.users.mgrA1)).includes(res.body.id));
  assert.ok(!(await overdueIds(w, w.users.mgrA2)).includes(res.body.id));
});

// ---- Reassignment -----------------------------------------------------------
test("Reassigning the lead moves follow-up visibility", async () => {
  const w = buildWorld();
  const adminFu = w.addFollowUp(w.leads.leadA1, w.users.admin, past());
  const sees = async (u) => (await overdueIds(w, u)).includes(adminFu.id);

  assert.equal(await sees(w.users.execA1), true);
  assert.equal(await sees(w.users.mgrA1), true);

  // Admin reassigns to an Executive on a different team.
  let res = await w.as(w.users.admin).post(`/api/leads/${w.leads.leadA1.id}/assign`).send({ userId: w.users.execA3.id });
  assert.equal(res.status, 200);
  assert.equal(await sees(w.users.execA1), false, "previous Executive loses it");
  assert.equal(await sees(w.users.mgrA1), false, "previous Manager loses it");
  assert.equal(await sees(w.users.execA3), true, "new Executive gains it");
  assert.equal(await sees(w.users.mgrA2), true, "new Executive's Manager gains it");
  assert.equal(await sees(w.users.admin), true);

  // And on to a Manager directly: only that Manager (and Admin) can see it.
  res = await w.as(w.users.admin).post(`/api/leads/${w.leads.leadA1.id}/assign`).send({ userId: w.users.mgrB.id });
  assert.equal(res.status, 200);
  assert.equal(await sees(w.users.mgrB), true);
  assert.equal(await sees(w.users.execB), false, "a Manager's own follow-up is not shared with reports");
  assert.equal(await sees(w.users.execA3), false);
  assert.equal(await sees(w.users.mgrA2), false);
});

// ---- Overdue and upcoming obey the same rules --------------------------------
test("Overdue and upcoming follow-ups follow identical visibility", async () => {
  const w = buildWorld();
  const overdueFu = w.addFollowUp(w.leads.leadA1, w.users.admin, past());
  const upcomingFu = w.addFollowUp(w.leads.leadA1, w.users.admin, future());

  for (const user of [w.users.execA1, w.users.mgrA1, w.users.admin]) {
    assert.ok((await overdueIds(w, user)).includes(overdueFu.id), `overdue: ${user.fullName}`);
    assert.ok((await upcomingIds(w, user)).includes(upcomingFu.id), `upcoming: ${user.fullName}`);
  }
  for (const user of [w.users.execA2, w.users.execA3, w.users.mgrA2, w.users.mgrB]) {
    assert.ok(!(await overdueIds(w, user)).includes(overdueFu.id), `overdue: ${user.fullName}`);
    assert.ok(!(await upcomingIds(w, user)).includes(upcomingFu.id), `upcoming: ${user.fullName}`);
  }
});

test("Unassigned lead: follow-up stays with its creator, hidden from other teams", async () => {
  const w = buildWorld();
  const lead = w.addLead("LD-000902", "Unassigned", null, w.users.mgrA1);
  const fu = w.addFollowUp(lead, w.users.mgrA1, past());

  assert.ok((await overdueIds(w, w.users.mgrA1)).includes(fu.id));
  assert.ok((await overdueIds(w, w.users.admin)).includes(fu.id));
  for (const other of [w.users.mgrA2, w.users.execA1, w.users.execA3]) {
    assert.ok(!(await overdueIds(w, other)).includes(fu.id));
  }
});

test("Follow-ups on deleted leads are never listed", async () => {
  const w = buildWorld();
  w.leads.leadA1.isDeleted = true;
  for (const user of [w.users.admin, w.users.mgrA1, w.users.execA1]) {
    assert.ok(!(await overdueIds(w, user)).includes(w.followUps.fuA1.id));
  }
});

// ---- API-level protection (frontend bypassed) ---------------------------------
test("Direct API calls cannot reach another team's follow-ups", async () => {
  const w = buildWorld();
  const adminFu = w.addFollowUp(w.leads.leadA3, w.users.admin, past());

  // Executive on a peer's lead, Manager on an unrelated team's lead.
  assert.equal((await w.as(w.users.execA1).get(`/api/leads/${w.leads.leadA3.id}/follow-ups`)).status, 403);
  assert.equal((await w.as(w.users.mgrA1).get(`/api/leads/${w.leads.leadA3.id}/follow-ups`)).status, 403);
  assert.equal(
    (await w.as(w.users.execA1).patch(`/api/leads/${w.leads.leadA3.id}/follow-ups/${adminFu.id}`).send({ status: "CANCELLED" })).status,
    403
  );
  assert.equal(
    (await w.as(w.users.mgrA1).delete(`/api/leads/${w.leads.leadA3.id}/follow-ups/${adminFu.id}`)).status,
    403
  );
  assert.equal(w.db.tables.followUp.find((f) => f.id === adminFu.id).status, "PENDING");

  // Query-string tricks do not widen the dashboard.
  const res = await w
    .as(w.users.execA1)
    .get(`/api/dashboard?ownerId=${w.users.execA3.id}&userId=${w.users.execA3.id}&scope=organization`);
  assert.equal(res.status, 200);
  assert.ok(!JSON.stringify(res.body).includes(adminFu.id));
});

test("A Manager who created a lead now assigned to another team cannot read that team's follow-ups", async () => {
  const w = buildWorld();
  const lead = w.addLead("LD-000903", "Handed off", w.users.execA3, w.users.mgrA1);
  const fu = w.addFollowUp(lead, w.users.execA3, past());

  const tab = await w.as(w.users.mgrA1).get(`/api/leads/${lead.id}/follow-ups`);
  assert.equal(tab.status, 200);
  assert.ok(!ids(tab.body).includes(fu.id));
  assert.ok(!(await overdueIds(w, w.users.mgrA1)).includes(fu.id));
  assert.ok((await leadTabIds(w, w.users.execA3, lead)).includes(fu.id));
});

// ---- Existing follow-up functionality still works ------------------------------
test("Assignee can complete, cancel and delete an Admin-created follow-up; Admin can too", async () => {
  const w = buildWorld();
  const L = `/api/leads/${w.leads.leadA1.id}/follow-ups`;
  const a = w.addFollowUp(w.leads.leadA1, w.users.admin, past());
  const b = w.addFollowUp(w.leads.leadA1, w.users.admin, past());
  const c = w.addFollowUp(w.leads.leadA1, w.users.admin, past());

  const done = await w.as(w.users.execA1).patch(`${L}/${a.id}`).send({ status: "COMPLETED" });
  assert.equal(done.status, 200);
  assert.equal(done.body.status, "COMPLETED");
  assert.ok(done.body.completedAt);
  assert.ok(!(await overdueIds(w, w.users.execA1)).includes(a.id), "completed follow-ups leave the overdue list");

  const cancelled = await w.as(w.users.mgrA1).patch(`${L}/${b.id}`).send({ status: "CANCELLED" });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.status, "CANCELLED");

  const removed = await w.as(w.users.admin).delete(`${L}/${c.id}`);
  assert.ok(removed.status === 200 || removed.status === 204);
  assert.ok(!w.db.tables.followUp.some((f) => f.id === c.id));

  // Creation by Executive and Manager still works on in-scope leads.
  const body = { dueAt: future().toISOString(), notes: "next" };
  assert.equal((await w.as(w.users.execA1).post(L).send(body)).status, 201);
  assert.equal((await w.as(w.users.mgrA1).post(L).send(body)).status, 201);
});
