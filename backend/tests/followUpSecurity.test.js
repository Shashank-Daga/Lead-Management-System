const test = require('node:test');
const assert = require('node:assert/strict');

const { canManageFollowUp, resolveFollowUpCompletionData } = require('../src/services/followUp.service');

const lead = {
  isDeleted: false,
  currentAssigneeId: 'exec-a',
  createdById: 'manager-a',
};

test('executive can manage only leads in their permitted scope', () => {
  const executive = {
    permissions: new Set(['followup.manage_assigned']),
    roleKey: 'EXECUTIVE',
    id: 'exec-a',
  };

  const otherExecutive = {
    permissions: new Set(['followup.manage_assigned']),
    roleKey: 'EXECUTIVE',
    id: 'exec-b',
  };

  assert.equal(canManageFollowUp(executive, lead, []), true);
  assert.equal(canManageFollowUp(otherExecutive, lead, []), false);
});

test('follow-up completion timestamps follow the required lifecycle rules', () => {
  assert.deepEqual(resolveFollowUpCompletionData('PENDING', 'COMPLETED', null), {
    status: 'COMPLETED',
    completedAt: resolveFollowUpCompletionData('PENDING', 'COMPLETED', null).completedAt,
  });

  const pendingFromCompleted = resolveFollowUpCompletionData('COMPLETED', 'PENDING', new Date('2026-01-01T00:00:00Z'));
  assert.equal(pendingFromCompleted.status, 'PENDING');
  assert.equal(pendingFromCompleted.completedAt, null);

  const cancelledFromCompleted = resolveFollowUpCompletionData('COMPLETED', 'CANCELLED', new Date('2026-01-01T00:00:00Z'));
  assert.equal(cancelledFromCompleted.status, 'CANCELLED');
  assert.equal(cancelledFromCompleted.completedAt, null);

  const pendingFromCancelled = resolveFollowUpCompletionData('CANCELLED', 'PENDING', null);
  assert.equal(pendingFromCancelled.status, 'PENDING');
  assert.equal(pendingFromCancelled.completedAt, null);
});

