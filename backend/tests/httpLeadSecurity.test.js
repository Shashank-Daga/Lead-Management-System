// Cross-user (IDOR) and team-access security tests, driven over HTTP
// against the real Express app + real services (in-memory database).
//
// Convention: an attacker who knows a valid UUID must be refused. Both 403
// (exists but forbidden) and 404 (hidden) are acceptable refusals; what is
// never acceptable is a 2xx or a change to the victim's data.
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildWorld, id } = require("./helpers/world");

const REFUSED = [403, 404];
const refused = (res, label) =>
  assert.ok(REFUSED.includes(res.status), `${label}: expected 403/404, got ${res.status} ${JSON.stringify(res.body)}`);
const unreadFor = (w, user) => w.db.tables.notification.filter((n) => n.userId === user.id);

/** Every lead-scoped endpoint an attacker could aim at a victim lead. */
function attacksOn(lead, { note, followUp }) {
  const L = `/api/leads/${lead.id}`;
  return [
    ["GET lead", (c) => c.get(L)],
    ["PATCH lead", (c) => c.patch(L).send({ clientName: "HACKED" })],
    ["DELETE lead", (c) => c.delete(L)],
    ["POST status", (c) => c.post(`${L}/status`).send({ status: "CONTACTED" })],
    ["POST priority", (c) => c.post(`${L}/priority`).send({ priority: "URGENT" })],
    ["GET history", (c) => c.get(`${L}/history`)],
    ["GET notes", (c) => c.get(`${L}/notes`)],
    ["POST note", (c) => c.post(`${L}/notes`).send({ body: "injected" })],
    ["PATCH note", (c) => c.patch(`${L}/notes/${note.id}`).send({ body: "HACKED" })],
    ["DELETE note", (c) => c.delete(`${L}/notes/${note.id}`)],
    ["GET follow-ups", (c) => c.get(`${L}/follow-ups`)],
    ["POST follow-up", (c) => c.post(`${L}/follow-ups`).send({ dueAt: new Date().toISOString() })],
    ["PATCH follow-up", (c) => c.patch(`${L}/follow-ups/${followUp.id}`).send({ status: "CANCELLED" })],
    ["DELETE follow-up", (c) => c.delete(`${L}/follow-ups/${followUp.id}`)],
  ];
}

/** Snapshot of everything an attack could have changed on a lead. */
function snapshot(w, lead) {
  const t = w.db.tables;
  return JSON.stringify({
    lead: t.lead.find((l) => l.id === lead.id),
    notes: t.leadNote.filter((n) => n.leadId === lead.id),
    followUps: t.followUp.filter((f) => f.leadId === lead.id),
    history: t.leadHistory.filter((h) => h.leadId === lead.id).length,
  });
}

async function assertAllRefused(w, actor, lead, related, who) {
  const before = snapshot(w, lead);
  for (const [label, run] of attacksOn(lead, related)) {
    refused(await run(w.as(actor)), `${who} -> ${label}`);
  }
  assert.equal(snapshot(w, lead), before, `${who}: victim data must be unchanged`);
}

// ---------------------------------------------------------------- IDOR ---------
test("IDOR: Executive A1 cannot touch Executive A2's lead in any way", async () => {
  const w = buildWorld();
  await assertAllRefused(w, w.users.execA1, w.leads.leadA2, { note: w.notes.noteA2, followUp: w.followUps.fuA2 }, "execA1");
});

test("IDOR: Executive A1 cannot touch a lead owned by another team", async () => {
  const w = buildWorld();
  await assertAllRefused(w, w.users.execA1, w.leads.leadA3, { note: w.notes.noteA2, followUp: w.followUps.fuA3 }, "execA1");
});

test("IDOR: Manager A1 cannot touch Manager A2's team lead", async () => {
  const w = buildWorld();
  await assertAllRefused(w, w.users.mgrA1, w.leads.leadA3, { note: w.notes.noteA2, followUp: w.followUps.fuA3 }, "mgrA1");
});

test("IDOR: Manager A2 cannot touch Manager A1's team leads", async () => {
  const w = buildWorld();
  await assertAllRefused(w, w.users.mgrA2, w.leads.leadA2, { note: w.notes.noteA2, followUp: w.followUps.fuA2 }, "mgrA2");
});

test("IDOR: list endpoint never leaks other users' leads", async () => {
  const w = buildWorld();
  const exec = await w.as(w.users.execA1).get("/api/leads");
  const codes = exec.body.items.map((l) => l.leadCode).sort();
  assert.deepEqual(codes, ["LD-000001", "LD-000004", "LD-000005"], "executive sees only own assigned leads");

  const mgr = await w.as(w.users.mgrA1).get("/api/leads");
  const mgrCodes = mgr.body.items.map((l) => l.leadCode);
  assert.ok(mgrCodes.includes("LD-000002") && !mgrCodes.includes("LD-000003"), "manager sees own team, not other teams");
});

test("IDOR: an executive cannot list another executive's leads via ?assignedTo=", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.execA1).get(`/api/leads?assignedTo=${w.users.execA2.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 0);
});

test("IDOR: executive cannot assign or reassign leads at all", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.execA1).post(`/api/leads/${w.leads.leadA1.id}/assign`).send({ userId: w.users.execA2.id });
  assert.equal(res.status, 403);
  assert.equal(w.leads.leadA1.currentAssigneeId, w.users.execA1.id);
});

test("IDOR: manager cannot assign a lead to an executive outside their team", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.mgrA1).post(`/api/leads/${w.leads.leadA1.id}/assign`).send({ userId: w.users.execA3.id });
  assert.equal(res.status, 403);
  assert.equal(w.db.tables.lead.find((l) => l.id === w.leads.leadA1.id).currentAssigneeId, w.users.execA1.id);
});

test("IDOR: malformed / random UUIDs return 404, never 500", async () => {
  const w = buildWorld();
  for (const bad of [id(), "not-a-uuid", "1' OR '1'='1"]) {
    const res = await w.as(w.users.admin).get(`/api/leads/${encodeURIComponent(bad)}`);
    assert.ok([400, 404, 422].includes(res.status), `got ${res.status} for ${bad}`);
  }
});

// ------------------------------------------------------ own-scope still works ----
test("Executive A1 CAN read and work on their own assigned lead", async () => {
  const w = buildWorld();
  const c = w.as(w.users.execA1);
  const L = `/api/leads/${w.leads.leadA1.id}`;
  assert.equal((await c.get(L)).status, 200);
  assert.equal((await c.patch(L).send({ clientName: "Renamed" })).status, 200);
  assert.equal((await c.post(`${L}/status`).send({ status: "CONTACTED" })).status, 200);
  assert.equal((await c.post(`${L}/priority`).send({ priority: "HIGH" })).status, 200);
  assert.equal((await c.post(`${L}/notes`).send({ body: "called" })).status, 201);
  assert.equal((await c.post(`${L}/follow-ups`).send({ dueAt: new Date(Date.now() + 1e6).toISOString() })).status, 201);
  assert.equal((await c.get(`${L}/history`)).status, 200);
  assert.equal((await c.delete(L)).status, 403, "executives can never delete leads");
});

test("Manager A1 CAN work on a lead assigned to their team", async () => {
  const w = buildWorld();
  const c = w.as(w.users.mgrA1);
  const L = `/api/leads/${w.leads.leadA2.id}`;
  assert.equal((await c.get(L)).status, 200);
  assert.equal((await c.patch(L).send({ clientName: "Team edit" })).status, 200);
  assert.equal((await c.post(`${L}/status`).send({ status: "CONTACTED" })).status, 200);
  assert.equal((await c.delete(L)).status, 403, "only Admin holds lead.delete");
});

// ------------------------------------------------------------ notes (E) ---------
test("Notes: author can edit and delete own note", async () => {
  const w = buildWorld();
  const c = w.as(w.users.execA1);
  const base = `/api/leads/${w.leads.leadA1.id}/notes/${w.notes.noteExecA1.id}`;
  const edit = await c.patch(base).send({ body: "edited" });
  assert.equal(edit.status, 200);
  assert.equal(edit.body.body, "edited");
  assert.equal((await c.delete(base)).status, 204);
  assert.ok(!w.db.tables.leadNote.some((n) => n.id === w.notes.noteExecA1.id));
});

test("Notes: an Executive cannot edit or delete a Manager's note on the same lead", async () => {
  const w = buildWorld();
  const base = `/api/leads/${w.leads.leadA1.id}/notes/${w.notes.noteMgrA1.id}`;
  assert.equal((await w.as(w.users.execA1).patch(base).send({ body: "HACKED" })).status, 403);
  assert.equal((await w.as(w.users.execA1).delete(base)).status, 403);
  assert.equal(w.db.tables.leadNote.find((n) => n.id === w.notes.noteMgrA1.id).body, "manager note");
});

test("Notes: a Manager can edit/delete a team member's note in scope", async () => {
  const w = buildWorld();
  const base = `/api/leads/${w.leads.leadA1.id}/notes/${w.notes.noteExecA1.id}`;
  assert.equal((await w.as(w.users.mgrA1).patch(base).send({ body: "moderated" })).status, 200);
  assert.equal((await w.as(w.users.mgrA1).delete(base)).status, 204);
});

test("Notes: a Manager outside the lead's scope cannot modify its notes", async () => {
  const w = buildWorld();
  const base = `/api/leads/${w.leads.leadA1.id}/notes/${w.notes.noteExecA1.id}`;
  refused(await w.as(w.users.mgrA2).patch(base).send({ body: "HACKED" }), "mgrA2 patch");
  refused(await w.as(w.users.mgrA2).delete(base), "mgrA2 delete");
  assert.equal(w.db.tables.leadNote.find((n) => n.id === w.notes.noteExecA1.id).body, "exec note");
});

test("Notes: Admin can modify any note in their own organization", async () => {
  const w = buildWorld();
  const base = `/api/leads/${w.leads.leadA1.id}/notes/${w.notes.noteMgrA1.id}`;
  assert.equal((await w.as(w.users.admin).patch(base).send({ body: "admin edit" })).status, 200);
  assert.equal((await w.as(w.users.admin).delete(base)).status, 204);
});

test("Notes: valid note id under the wrong lead id is 404", async () => {
  const w = buildWorld();
  const url = `/api/leads/${w.leads.leadA2.id}/notes/${w.notes.noteExecA1.id}`; // note belongs to leadA1
  assert.equal((await w.as(w.users.admin).patch(url).send({ body: "x" })).status, 404);
  assert.equal((await w.as(w.users.admin).delete(url)).status, 404);
});

// ------------------------------------------------------- follow-ups (F) ----------
test("Follow-ups: executive manages follow-ups on own lead, not a peer's", async () => {
  const w = buildWorld();
  const c = w.as(w.users.execA1);
  assert.equal((await c.get(`/api/leads/${w.leads.leadA1.id}/follow-ups`)).status, 200);
  assert.equal((await c.post(`/api/leads/${w.leads.leadA1.id}/follow-ups`).send({ dueAt: new Date(Date.now() + 1e6).toISOString() })).status, 201);
  refused(await c.get(`/api/leads/${w.leads.leadA2.id}/follow-ups`), "peer list");
  refused(await c.post(`/api/leads/${w.leads.leadA2.id}/follow-ups`).send({ dueAt: new Date().toISOString() }), "peer create");
});

test("Follow-ups: manager works on team leads, is refused on unrelated leads", async () => {
  const w = buildWorld();
  const c = w.as(w.users.mgrA1);
  assert.equal((await c.get(`/api/leads/${w.leads.leadA2.id}/follow-ups`)).status, 200);
  assert.equal((await c.post(`/api/leads/${w.leads.leadA2.id}/follow-ups`).send({ dueAt: new Date(Date.now() + 1e6).toISOString() })).status, 201);
  refused(await c.get(`/api/leads/${w.leads.leadA3.id}/follow-ups`), "unrelated list");
  refused(await c.patch(`/api/leads/${w.leads.leadA3.id}/follow-ups/${w.followUps.fuA3.id}`).send({ status: "CANCELLED" }), "unrelated patch");
});

test("Follow-ups: admin can manage follow-ups across the organization", async () => {
  const w = buildWorld();
  const c = w.as(w.users.admin);

  for (const l of [w.leads.leadA1, w.leads.leadA2, w.leads.leadA3, w.leads.leadB1]) {
    assert.equal((await c.get(`/api/leads/${l.id}/follow-ups`)).status, 200);
  }

  assert.equal(
    (await c.patch(
      `/api/leads/${w.leads.leadB1.id}/follow-ups/${w.followUps.fuB1.id}`
    ).send({ status: "CANCELLED" })).status,
    200
  );

  assert.equal(
    w.db.tables.followUp.find((f) => f.id === w.followUps.fuB1.id).status,
    "CANCELLED"
  );
});

test("Follow-ups: a valid follow-up id cannot be used with a different lead id", async () => {
  const w = buildWorld();
  // fuA2 belongs to leadA2. Try it through leadA1 as every actor who can see leadA1.
  for (const actor of [w.users.execA1, w.users.mgrA1, w.users.admin]) {
    const url = `/api/leads/${w.leads.leadA1.id}/follow-ups/${w.followUps.fuA2.id}`;
    assert.equal((await w.as(actor).patch(url).send({ status: "CANCELLED", notes: "HACKED" })).status, 404, `${actor.fullName} patch`);
    assert.equal((await w.as(actor).delete(url)).status, 404, `${actor.fullName} delete`);
  }
  const fu = w.db.tables.followUp.find((f) => f.id === w.followUps.fuA2.id);
  assert.equal(fu.status, "PENDING");
  assert.equal(fu.notes, null);
});

// ------------------------------------------------------ leads CRUD + filters ------
test("Admin: create / read / update / delete a lead", async () => {
  const w = buildWorld();
  const c = w.as(w.users.admin);
  const created = await c.post("/api/leads").send({ clientName: "Newco", contactPerson: "Pat", phone: "555123456", source: "referral" });
  assert.equal(created.status, 201);
  assert.match(created.body.leadCode, /^LD-\d{6}$/);
  const L = `/api/leads/${created.body.id}`;
  assert.equal((await c.get(L)).body.clientName, "Newco");
  assert.equal((await c.patch(L).send({ clientName: "Newco 2" })).body.clientName, "Newco 2");
  assert.equal((await c.delete(L)).status, 204);
  assert.equal((await c.get(L)).status, 404, "soft-deleted leads disappear");
  assert.ok(w.db.tables.lead.find((l) => l.id === created.body.id).isDeleted, "record kept (soft delete)");
});

test("Manager: can create leads, only for their own team; executive cannot create", async () => {
  const w = buildWorld();
  const body = { clientName: "M lead", contactPerson: "C", phone: "555123456", source: "web" };
  const own = await w.as(w.users.mgrA1).post("/api/leads").send({ ...body, assignToUserId: w.users.execA1.id });
  assert.equal(own.status, 201);
  const other = await w.as(w.users.mgrA1).post("/api/leads").send({ ...body, assignToUserId: w.users.execA3.id });
  assert.equal(other.status, 403);
  assert.equal((await w.as(w.users.execA1).post("/api/leads").send(body)).status, 403);
});

test("Leads: search, status/priority filters, pagination and sorting", async () => {
  const w = buildWorld();
  const c = w.as(w.users.admin);
  for (const [name, priority] of [["Alpha", "HIGH"], ["Beta", "LOW"], ["Gamma", "HIGH"], ["Delta", "URGENT"]]) {
    await c.post("/api/leads").send({ clientName: name, contactPerson: "P", phone: "555123456", source: "web", priority });
  }
  const search = await c.get("/api/leads?search=alph");
  assert.deepEqual(search.body.items.map((l) => l.clientName), ["Alpha"]);
  const high = await c.get("/api/leads?priority=HIGH&pageSize=100");
  assert.ok(high.body.items.length >= 2 && high.body.items.every((l) => l.priority === "HIGH"));
  const converted = await c.get("/api/leads?status=CONVERTED");
  assert.equal(converted.body.items.length, 1);
  const page1 = await c.get("/api/leads?pageSize=3&page=1&sortBy=clientName&sortOrder=asc");
  const page2 = await c.get("/api/leads?pageSize=3&page=2&sortBy=clientName&sortOrder=asc");
  assert.equal(page1.body.items.length, 3);
  assert.notDeepEqual(page1.body.items.map((l) => l.id), page2.body.items.map((l) => l.id));
  const names = page1.body.items.map((l) => l.clientName);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b)));
  assert.equal(page1.body.pagination.pageSize, 3);
  assert.equal((await c.get("/api/leads?sortBy=passwordHash")).status, 422, "sort column is allow-listed");
});

test("Status transitions: invalid transitions are rejected, valid ones recorded in history", async () => {
  const w = buildWorld();
  const c = w.as(w.users.execA1);
  const L = `/api/leads/${w.leads.leadA1.id}`;

  // Moving to the same status is invalid.
  assert.equal((await c.post(`${L}/status`).send({ status: "NEW" })).status, 422);

  // Active stages can now move backward or forward.
  assert.equal((await c.post(`${L}/status`).send({ status: "CONTACTED" })).status, 200);

  const history = (await c.get(`${L}/history`)).body;
  assert.ok(
    history.some(
      (h) => h.eventType === "STATUS_CHANGE" && h.toValue === "CONTACTED"
    )
  );
});

// ------------------------------------------------ assignment (positive paths) ------
// Regression: canAssignLead once read `targetUser.roleKey`, which database rows
// don't have (they carry `role.key`), so NOBODY could assign a lead.
test("Assignment: Admin assigns an executive; history and notification are recorded", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.admin).post(`/api/leads/${w.leads.leadA1.id}/assign`).send({ userId: w.users.execA2.id, reason: "rebalance" });
  assert.equal(res.status, 200);
  assert.equal(w.db.tables.lead.find((l) => l.id === w.leads.leadA1.id).currentAssigneeId, w.users.execA2.id);
  assert.equal(w.db.tables.assignmentHistory.length, 1);
  assert.ok(w.db.tables.notification.some((n) => n.userId === w.users.execA2.id && n.type === "LEAD_ASSIGNED"));
});

test("Assignment: Manager assigns within their own team only", async () => {
  const w = buildWorld();
  const ok = await w.as(w.users.mgrA1).post(`/api/leads/${w.leads.leadA1.id}/assign`).send({ userId: w.users.execA2.id });
  assert.equal(ok.status, 200);
  const bad = await w.as(w.users.mgrA1).post(`/api/leads/${w.leads.leadA2.id}/assign`).send({ userId: w.users.execA3.id });
  assert.equal(bad.status, 403);
});

test("Assignment: an inactive executive cannot be assigned leads", async () => {
  const w = buildWorld();
  w.users.execA2.isActive = false;
  const res = await w.as(w.users.admin).post(`/api/leads/${w.leads.leadA1.id}/assign`).send({ userId: w.users.execA2.id });
  refused(res, "inactive assignee");
});

test("Assignment: Admin can assign a lead to a Manager", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.admin)
    .post(`/api/leads/${w.leads.leadA1.id}/assign`)
    .send({ userId: w.users.mgrA1.id });

  assert.equal(res.status, 200);
  assert.equal(res.body.currentAssigneeId, w.users.mgrA1.id);
});

// ------------------------------------------------ Issue 1: manager self-assign ----
test("Assignable users: Manager sees themselves plus their active executives", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.mgrA1).get("/api/users/assignable");
  assert.equal(res.status, 200);
  assert.deepEqual(
    res.body.map((u) => u.id).sort(),
    [w.users.mgrA1.id, w.users.execA1.id, w.users.execA2.id].sort()
  );
});

test("Assignment: a Manager can assign a lead to themselves, with no self-notification", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.mgrA1).post(`/api/leads/${w.leads.leadA1.id}/assign`).send({ userId: w.users.mgrA1.id });
  assert.equal(res.status, 200);
  assert.equal(w.db.tables.lead.find((l) => l.id === w.leads.leadA1.id).currentAssigneeId, w.users.mgrA1.id);
  assert.equal(unreadFor(w, w.users.mgrA1).length, 0, "no 'assigned to you' notification for self-assignment");
});

test("Assignable users: Manager A cannot see another team's members", async () => {
  const w = buildWorld();
  const res = await w.as(w.users.mgrA1).get("/api/users/assignable");
  const ids = res.body.map((u) => u.id);
  assert.ok(!ids.includes(w.users.execA3.id), "other team's executive excluded");
  // assignment, atomic manager deactivation, and role/team-based user access.d");
});

test("Assignable users: Admin sees all active Managers and Executives", async () => {
  const w = buildWorld();

  const res = await w.as(w.users.admin).get("/api/users/assignable");

  assert.equal(res.status, 200);

  const ids = res.body.map((u) => u.id).sort();

  assert.deepEqual(
    ids,
    [
      w.users.mgrA1.id,
      w.users.mgrA2.id,
      w.users.execA1.id,
      w.users.execA2.id,
      w.users.execA3.id,
      w.users.mgrB.id,
      w.users.execB.id,
    ].sort()
  );

  assert.ok(res.body.every((u) => ["MANAGER", "EXECUTIVE"].includes(u.role.key)));
});
