const test = require('node:test');
const assert = require('node:assert/strict');

const { buildLeadVisibilityWhere, applyLeadVisibilityScope } = require('../src/services/leadScope.service');

const manager = {
  id: 'manager-1',
  organizationId: 'org-1',
  roleKey: 'MANAGER',
  permissions: new Set(['lead.view_scoped']),
};

test('manager scope keeps its own visibility filter separate from search predicates', () => {
  const visibility = buildLeadVisibilityWhere(manager, ['exec-1']);

  assert.deepEqual(visibility, {
    organizationId: 'org-1',
    isDeleted: false,
    OR: [
      { currentAssigneeId: { in: ['manager-1', 'exec-1'] } },
      { createdById: 'manager-1' },
    ],
  });

  const scopedQuery = applyLeadVisibilityScope(manager, { clientName: { contains: 'Acme', mode: 'insensitive' } }, ['exec-1']);

  assert.deepEqual(scopedQuery, {
    AND: [
      {
        organizationId: 'org-1',
        isDeleted: false,
        OR: [
          { currentAssigneeId: { in: ['manager-1', 'exec-1'] } },
          { createdById: 'manager-1' },
        ],
      },
      { clientName: { contains: 'Acme', mode: 'insensitive' } },
    ],
  });
});
