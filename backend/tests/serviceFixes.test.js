const test = require("node:test");
const assert = require("node:assert/strict");
const { installFakePrisma, makeUser } = require("./helpers/fakePrisma");
const { PERMISSIONS } = require("../src/config/permissions");


// ---- A2: overdue follow-up scoping ------------------------------------------
// The fake evaluates the `where` the service builds against an in-memory table,
// so these tests prove the query itself is scoped correctly.
function fakeFollowUpTable(rows) {
  return {
    followUp: {
      findMany: async ({ where }) =>
        rows.filter((r) => {
          if (where.status && r.status !== where.status) return false;
          if (where.dueAt && !(r.dueAt < where.dueAt.lt)) return false;
          if (where.ownerId?.in && !where.ownerId.in.includes(r.ownerId)) return false;
          return true;
        }),
    },
  };
}

const past = new Date(Date.now() - 86400000);
const rows = [
  { id: "f-exec1", ownerId: "exec1", status: "PENDING", dueAt: past, lead: {} },
  { id: "f-exec2", ownerId: "exec2", status: "PENDING", dueAt: past, lead: {} },
  { id: "f-other-team", ownerId: "execX", status: "PENDING", dueAt: past, lead: {} },
  { id: "f-other-manager", ownerId: "execB", status: "PENDING", dueAt: past, lead: {} },
  { id: "f-done", ownerId: "exec1", status: "COMPLETED", dueAt: past, lead: {} },
];

test("A2: Admin sees other users' overdue follow-ups org-wide", async () => {
  installFakePrisma(fakeFollowUpTable(rows));
  const svc = require("../src/services/followUp.service");
  const admin = makeUser({ id: "admin", roleKey: "ADMIN", permissions: new Set([PERMISSIONS.FOLLOWUP_MANAGE_ALL, PERMISSIONS.LEAD_VIEW_ALL]) });
  const ids = (await svc.listOverdueFollowUps(admin, [])).map((f) => f.id).sort();
  assert.deepEqual(ids, ["f-exec1", "f-exec2", "f-other-manager", "f-other-team"]);
});

test("A2: Manager sees team follow-ups but not an unrelated team's", async () => {
  installFakePrisma(fakeFollowUpTable(rows));
  const svc = require("../src/services/followUp.service");
  // Managers really hold followup.manage_all; they must still be team-scoped.
  const mgr = makeUser({ id: "mgr", roleKey: "MANAGER", permissions: new Set([PERMISSIONS.FOLLOWUP_MANAGE_ALL, PERMISSIONS.LEAD_VIEW_SCOPED]) });
  const ids = (await svc.listOverdueFollowUps(mgr, ["exec1", "exec2"])).map((f) => f.id).sort();
  assert.deepEqual(ids, ["f-exec1", "f-exec2"]);
  assert.ok(!ids.includes("f-other-team"));
});

test("A2: Executive sees only own follow-ups", async () => {
  installFakePrisma(fakeFollowUpTable(rows));
  const svc = require("../src/services/followUp.service");
  const exec = makeUser({ id: "exec1", permissions: new Set([PERMISSIONS.FOLLOWUP_MANAGE_ASSIGNED]) });
  const ids = (await svc.listOverdueFollowUps(exec, [])).map((f) => f.id);
  assert.deepEqual(ids, ["f-exec1"]);
});

// ---- A3: assignment history names ---------------------------------------------
test("A3: assignment history resolves UUIDs to names, falls back to raw id if user is gone", async () => {
  const EXEC_A = "22222222-2222-4222-8222-222222222222";
  const GONE = "33333333-3333-4333-8333-333333333333";
  const events = [
    { id: "e1", eventType: "ASSIGNED", fromValue: null, toValue: EXEC_A, actor: { fullName: "Manager B" } },
    { id: "e2", eventType: "REASSIGNED", fromValue: EXEC_A, toValue: GONE, actor: { fullName: "Manager B" } },
    { id: "e3", eventType: "STATUS_CHANGE", fromValue: "NEW", toValue: "CONTACTED", actor: { fullName: "Manager B" } },
  ];
  let lookedUp = null;
  installFakePrisma({
    lead: { findFirst: async () => ({ id: "L1", isDeleted: false, createdById: "x", currentAssigneeId: null }) },
    users: {
      findMany: async ({ where }) => {
        lookedUp = where.id.in;
        return [{ id: EXEC_A, fullName: "Executive A" }].filter((u) =>
          where.id.in.includes(u.id)
        );
      },
    },
    leadHistory: { findMany: async () => events.map((e) => ({ ...e })) },
  });
  const { getLeadHistory } = require("../src/services/lead.service");
  const admin = makeUser({
    permissions: new Set([
      PERMISSIONS.LEAD_VIEW_ALL,
      PERMISSIONS.HISTORY_VIEW_ALL,
    ]),
  });
  const out = await getLeadHistory(admin, "L1");
  assert.equal(out[0].toValue, "Executive A");
  assert.equal(out[1].fromValue, "Executive A");
  assert.equal(out[1].toValue, GONE, "raw id preserved only as fallback");
  assert.equal(out[2].fromValue, "NEW", "non-assignment events untouched");
  assert.ok(!lookedUp.includes("NEW"));
});

// ---- A4: atomic manager deactivation ------------------------------------------
function fakeUserDb({ failOnUserUpdate = false } = {}) {
  const state = { managerIdOf: { e1: "m1", e2: "m1" }, mgrActive: true };
  const snapshot = () => JSON.parse(JSON.stringify(state));
  const tx = {
    users: {
      updateMany: async () => {
        state.managerIdOf = { e1: null, e2: null };
        return { count: 2 };
      },
      update: async ({ data }) => {
        if (failOnUserUpdate) throw new Error("boom");
        state.mgrActive = data.isActive;
        return { id: "m1", isActive: data.isActive };
      },
    },
  };
  return {
    state,
    users: {
      findUnique: async () => ({
        id: "m1",
        role: { key: "MANAGER" },
        isActive: true,
      }),
    },
    $transaction: async (fn) => {
      const before = snapshot();
      try {
        return await fn(tx);
      } catch (e) {
        Object.assign(state, before); // emulate rollback
        throw e;
      }
    },
  };
}

test("A4: manager deactivation reassigns executives and deactivates in one transaction", async () => {
  const db = fakeUserDb();
  installFakePrisma(db);
  const { deactivateUser } = require("../src/services/user.service");
  const result = await deactivateUser("m1");
  assert.equal(result.isActive, false);
  assert.deepEqual(db.state.managerIdOf, { e1: null, e2: null });
});

test("A4: failure during deactivation rolls back the executive reassignment", async () => {
  const db = fakeUserDb({ failOnUserUpdate: true });
  installFakePrisma(db);
  const { deactivateUser } = require("../src/services/user.service");
  await assert.rejects(() => deactivateUser("m1"), /boom/);
  assert.deepEqual(db.state.managerIdOf, { e1: "m1", e2: "m1" }, "executives untouched after rollback");
  assert.equal(db.state.mgrActive, true);
});

// ---- A5: notification id consistency ------------------------------------------
test("A5: notifyUser returns the id of the persisted row", async () => {
  const DB_ID = "44444444-4444-4444-8444-444444444444";
  installFakePrisma({});
  const { notifyUser } = require("../src/services/notification.service");
  const tx = {
    notification: {
      create: async ({ data }) => ({ id: DB_ID, ...data, createdAt: new Date() }),
    },
  };
  const n = await notifyUser("mgr", { type: "EXECUTIVE_ASSIGNED", title: "t", message: "m", metadata: { a: 1 } }, tx);
  assert.equal(n.id, DB_ID);
  assert.deepEqual(n.metadata, { a: 1 });
});
