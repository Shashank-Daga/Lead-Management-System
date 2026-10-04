const test = require('node:test');
const assert = require('node:assert/strict');

const { isValidTransition } = require('../src/config/statusTransitions');
const { canAssignLead } = require('../src/services/leadScope.service');
const { createNotification, formatNotification } = require('../src/services/notification.service');

test('manager assignments remain restricted to team executives', () => {
  const actor = {
    id: 'manager-1',
    roleKey: 'MANAGER',
    permissions: new Set(['lead.assign']),
  };

  const validTarget = {
    id: 'exec-1',
    isActive: true,
    roleKey: 'EXECUTIVE',
    managerId: 'manager-1',
  };

  const invalidTarget = {
    id: 'exec-2',
    isActive: true,
    roleKey: 'EXECUTIVE',
    managerId: 'manager-99',
  };

  assert.equal(canAssignLead(actor, validTarget, ['exec-1']), true);
  assert.equal(canAssignLead(actor, invalidTarget, ['exec-1']), false);
});

test('status matrix allows flexible active transitions and controlled hold resume', () => {
  assert.equal(isValidTransition('NEW', 'CONTACTED'), true);

  assert.equal(isValidTransition('NEW', 'CONVERTED'), true);

  assert.equal(isValidTransition('ON_HOLD', 'QUALIFIED', 'QUALIFIED'), true);

  assert.equal(isValidTransition('ON_HOLD', 'NEGOTIATION', 'QUALIFIED'), false);

  assert.equal(isValidTransition('CONVERTED', 'LOST'), true);
});

test('notification payloads remain consistently shaped', () => {
  const notification = createNotification('user-1', {
    type: 'LEAD_ASSIGNED',
    title: 'Lead assigned',
    message: 'Lead LD-000001 was assigned to you.',
    metadata: { leadId: 'lead-1', leadCode: 'LD-000001' },
  });

  assert.deepEqual(formatNotification(notification), {
    id: notification.id,
    type: 'LEAD_ASSIGNED',
    title: 'Lead assigned',
    message: 'Lead LD-000001 was assigned to you.',
    isRead: false,
    createdAt: notification.createdAt,
    metadata: { leadId: 'lead-1', leadCode: 'LD-000001' },
  });
});

