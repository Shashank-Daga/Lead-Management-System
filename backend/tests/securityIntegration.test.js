const test = require('node:test');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');

const { createUser, deactivateUser } = require('../src/services/user.service');
const { notifyUser } = require('../src/services/notification.service');

// These tests need a generated Prisma client AND a reachable PostgreSQL
// (DATABASE_URL). When either is missing they are reported as SKIPPED, never
// as passed, so a green run without a database is visibly not a full run.
let prisma = null;
let SKIP = false;
try {
  prisma = new PrismaClient();
} catch {
  SKIP = 'Prisma client not generated / database unavailable';
}

async function ensureRole(roleKey) {
  const role = await prisma.role.upsert({
    where: { key: roleKey },
    update: {},
    create: { key: roleKey, name: roleKey },
  });
  return role;
}

async function makeUser(orgId, roleKey, email, fullName, managerId = null) {
  const role = await ensureRole(roleKey);
  const passwordHash = '$argon2id$v=19$m=65536,t=3,p=4$testhash';
  return prisma.users.create({
    data: {
      organizationId: orgId,
      email,
      fullName,
      passwordHash,
      roleId: role.id,
      managerId,
    },
  });
}

test('deactivating a manager clears active reports without touching historical audit state', { skip: SKIP }, async () => {
  const org = await prisma.organization.create({
    data: { name: `Org-${Date.now()}-${Math.random().toString(16).slice(2)}` },
  });

  const manager = await makeUser(org.id, 'MANAGER', `manager-${Date.now()}@example.com`, 'Manager A');
  const execA = await makeUser(org.id, 'EXECUTIVE', `exec-a-${Date.now()}@example.com`, 'Executive A', manager.id);
  const execB = await makeUser(org.id, 'EXECUTIVE', `exec-b-${Date.now()}@example.com`, 'Executive B', manager.id);

  await deactivateUser(org.id, manager.id);

  const [updatedExecA, updatedExecB] = await Promise.all([
    prisma.users.findUnique({ where: { id: execA.id } }),
    prisma.users.findUnique({ where: { id: execB.id } }),
  ]);

  assert.equal(updatedExecA.managerId, null);
  assert.equal(updatedExecB.managerId, null);
  assert.equal(updatedExecA.isActive, true);
  assert.equal(updatedExecB.isActive, true);
});

test('notifications created inside a transaction are rolled back on failure', { skip: SKIP }, async () => {
  const org = await prisma.organization.create({
    data: { name: `Org-${Date.now()}-${Math.random().toString(16).slice(2)}` },
  });

  const manager = await makeUser(org.id, 'MANAGER', `manager-tx-${Date.now()}@example.com`, 'Manager TX');
  const exec = await makeUser(org.id, 'EXECUTIVE', `exec-tx-${Date.now()}@example.com`, 'Executive TX', manager.id);

  await prisma.$transaction(async (tx) => {
    await notifyUser(exec.id, {
      type: 'LEAD_ASSIGNED',
      title: 'Transaction test',
      message: 'Message should be rolled back',
      metadata: { test: true },
    }, tx);
    throw new Error('rollback transaction');
  }).catch(() => {});

  const notification = await prisma.notification.findFirst({
    where: { userId: exec.id, title: 'Transaction test' },
  });

  assert.equal(notification, null);
});

test('notifications created inside a successful transaction remain persisted', { skip: SKIP }, async () => {
  const org = await prisma.organization.create({
    data: { name: `Org-${Date.now()}-${Math.random().toString(16).slice(2)}` },
  });

  const manager = await makeUser(org.id, 'MANAGER', `manager-commit-${Date.now()}@example.com`, 'Manager Commit');
  const exec = await makeUser(org.id, 'EXECUTIVE', `exec-commit-${Date.now()}@example.com`, 'Executive Commit', manager.id);

  await prisma.$transaction(async (tx) => {
    await notifyUser(exec.id, {
      type: 'LEAD_ASSIGNED',
      title: 'Committed notification',
      message: 'Persisted after successful transaction',
      metadata: { test: true },
    }, tx);
  });

  const notification = await prisma.notification.findFirst({
    where: { userId: exec.id, title: 'Committed notification' },
  });

  assert.ok(notification);
  assert.equal(notification.isRead, false);
});

test('admin manager assignment creates the manager notification for the executive', { skip: SKIP }, async () => {
  const org = await prisma.organization.create({
    data: { name: `Org-${Date.now()}-${Math.random().toString(16).slice(2)}` },
  });

  const manager = await createUser(org.id, {
    fullName: 'Manager Notify',
    email: `manager-notify-${Date.now()}@example.com`,
    password: 'Password123!',
    roleKey: 'MANAGER',
  });

  const executive = await createUser(org.id, {
    fullName: 'Executive Notify',
    email: `exec-notify-${Date.now()}@example.com`,
    password: 'Password123!',
    roleKey: 'EXECUTIVE',
    managerId: manager.id,
  });

  const notification = await prisma.notification.findFirst({
    where: {
      userId: manager.id,
      type: 'EXECUTIVE_ASSIGNED',
      message: `${executive.fullName} is now assigned to your team.`,
    },
  });

  assert.ok(notification);
  assert.equal(notification.metadata.executiveId, executive.id);
});
test.after(async () => {
  if (prisma) await prisma.$disconnect();
});
