// Builds a two-organization world in the in-memory database and returns the
// real Express app bound to it, plus helpers to call it as any user.
//
//   Org A: admin, mgrA1 (team: execA1, execA2), mgrA2 (team: execA3)
//   Org B: adminB, mgrB (team: execB)
//
// Each test calls buildWorld() for a fresh, isolated dataset.
process.env.JWT_ACCESS_SECRET = "world_access_secret_0123456789abcdef0123";
process.env.JWT_REFRESH_SECRET = "world_refresh_secret_0123456789abcdef012";
process.env.NODE_ENV = "test";

const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const request = require("supertest");
const { createMemoryDb } = require("./memoryDb");
const { installFakePrisma } = require("./fakePrisma");
const { DEFAULT_ROLE_PERMISSIONS } = require("../../src/config/permissions");

const id = () => crypto.randomUUID();
const HOUR = 3600 * 1000;

function buildWorld() {
  const db = createMemoryDb();

  const roles = {};
  for (const [key, perms] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = { id: id(), key, name: key.charAt(0) + key.slice(1).toLowerCase() };
    db.tables.role.push(role);
    roles[key] = {
      ...role,
      permissions: perms.map((p) => ({ permission: { key: p } })),
    };
  }

  const orgA = id();
  const orgB = id();
  const users = {};
  const addUser = (name, org, roleKey, managerId = null, extra = {}) => {
    const u = {
      id: id(),
      organizationId: org,
      fullName: name,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      passwordHash: "x",
      isActive: true,
      managerId,
      roleId: roles[roleKey].id,
      role: roles[roleKey],
      createdAt: new Date(),
      ...extra,
    };
    db.tables.users.push(u);
    users[name] = u;
    return u;
  };

  const admin = addUser("Admin A", orgA, "ADMIN");
  const mgrA1 = addUser("Manager A1", orgA, "MANAGER");
  const mgrA2 = addUser("Manager A2", orgA, "MANAGER");
  const execA1 = addUser("Exec A1", orgA, "EXECUTIVE", mgrA1.id);
  const execA2 = addUser("Exec A2", orgA, "EXECUTIVE", mgrA1.id);
  const execA3 = addUser("Exec A3", orgA, "EXECUTIVE", mgrA2.id);
  const adminB = addUser("Admin B", orgB, "ADMIN");
  const mgrB = addUser("Manager B", orgB, "MANAGER");
  const execB = addUser("Exec B", orgB, "EXECUTIVE", mgrB.id);

  const addLead = (org, code, name, assignee, creator, extra = {}) => {
    const lead = {
      id: id(),
      leadCode: code,
      organizationId: org,
      clientName: name,
      contactPerson: "Contact",
      phone: "9999999999",
      source: "web",
      status: "NEW",
      priority: "MEDIUM",
      isDeleted: false,
      tags: [],
      currentAssigneeId: assignee ? assignee.id : null,
      assignmentDate: assignee ? new Date() : null,
      createdById: creator.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...extra,
    };
    db.tables.lead.push(lead);
    return lead;
  };

  const leadA1 = addLead(orgA, "LD-000001", "Acme A1", execA1, mgrA1);
  const leadA2 = addLead(orgA, "LD-000002", "Bolt A2", execA2, mgrA1);
  const leadA3 = addLead(orgA, "LD-000003", "Core A3", execA3, mgrA2);
  const leadB1 = addLead(orgB, "LD-000101", "Zeta B1", execB, mgrB);
  // Resolved leads for execA1 (dashboard numbers)
  addLead(orgA, "LD-000004", "Done Won", execA1, mgrA1, { status: "CONVERTED", assignmentDate: new Date(Date.now() - 30 * 24 * HOUR) });
  addLead(orgA, "LD-000005", "Done Lost", execA1, mgrA1, { status: "LOST", assignmentDate: new Date(Date.now() - 30 * 24 * HOUR) });

  const addFollowUp = (lead, owner, dueAt, extra = {}) => {
    const f = { id: id(), leadId: lead.id, ownerId: owner.id, dueAt, notes: null, status: "PENDING", createdAt: new Date(), updatedAt: new Date(), ...extra };
    db.tables.followUp.push(f);
    return f;
  };
  const past = new Date(Date.now() - 24 * HOUR);
  const future = new Date(Date.now() + 48 * HOUR);
  const fuA1 = addFollowUp(leadA1, execA1, past);
  const fuA1Upcoming = addFollowUp(leadA1, execA1, future);
  const fuA2 = addFollowUp(leadA2, execA2, past);
  const fuA3 = addFollowUp(leadA3, execA3, past);
  const fuB1 = addFollowUp(leadB1, execB, past);

  const addNote = (lead, author, body) => {
    const n = { id: id(), leadId: lead.id, authorId: author.id, body, createdAt: new Date(), updatedAt: new Date() };
    db.tables.leadNote.push(n);
    return n;
  };
  const noteExecA1 = addNote(leadA1, execA1, "exec note");
  const noteMgrA1 = addNote(leadA1, mgrA1, "manager note");
  const noteA2 = addNote(leadA2, execA2, "peer note");
  const noteB1 = addNote(leadB1, execB, "org b note");

  installFakePrisma(db);
  const app = require("../../src/app");

  const tokenFor = (u) => jwt.sign({ sub: u.id }, process.env.JWT_ACCESS_SECRET, { expiresIn: "15m" });
  // `as(user).get('/api/leads')` -> supertest request authenticated as that user
  const as = (u) => {
    const auth = (r) => r.set("Authorization", `Bearer ${tokenFor(u)}`);
    return {
      get: (url) => auth(request(app).get(url)),
      post: (url) => auth(request(app).post(url)),
      patch: (url) => auth(request(app).patch(url)),
      delete: (url) => auth(request(app).delete(url)),
    };
  };

  return {
    db, app, as, request: () => request(app),
    orgA, orgB, roles,
    users: { admin, mgrA1, mgrA2, execA1, execA2, execA3, adminB, mgrB, execB },
    leads: { leadA1, leadA2, leadA3, leadB1 },
    followUps: { fuA1, fuA1Upcoming, fuA2, fuA3, fuB1 },
    notes: { noteExecA1, noteMgrA1, noteA2, noteB1 },
    addLead, addFollowUp,
  };
}

module.exports = { buildWorld, id };
