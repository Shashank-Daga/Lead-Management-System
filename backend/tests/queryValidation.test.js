const test = require('node:test');
const assert = require('node:assert/strict');
const { z } = require('zod');

const { listLeadsQuerySchema } = require('../src/validators/lead.schema');

test('valid lead queries are accepted', () => {
  const parsed = listLeadsQuerySchema.parse({
    status: 'NEW,CONTACTED',
    priority: 'HIGH,URGENT',
    page: '1',
    pageSize: '25',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  assert.deepEqual(parsed.status, 'NEW,CONTACTED');
  assert.deepEqual(parsed.priority, 'HIGH,URGENT');
});

test('invalid enum values fail validation before Prisma sees them', () => {
  assert.throws(() => listLeadsQuerySchema.parse({ status: 'INVALID' }));
  assert.throws(() => listLeadsQuerySchema.parse({ priority: 'INVALID' }));
  assert.throws(() => listLeadsQuerySchema.parse({ status: 'NEW,INVALID' }));
  assert.throws(() => listLeadsQuerySchema.parse({ priority: 'HIGH,INVALID' }));
});
