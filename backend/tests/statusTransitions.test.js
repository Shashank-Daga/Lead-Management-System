const test = require('node:test');
const assert = require('node:assert/strict');

const { isValidTransition } = require('../src/config/statusTransitions');

test('ON_HOLD resumes only to the prior active status', () => {
  assert.equal(isValidTransition('QUALIFIED', 'ON_HOLD'), true);
  assert.equal(isValidTransition('ON_HOLD', 'QUALIFIED', 'QUALIFIED'), true);
  assert.equal(isValidTransition('ON_HOLD', 'NEGOTIATION', 'QUALIFIED'), false);
  assert.equal(isValidTransition('ON_HOLD', 'PROPOSAL', 'QUALIFIED'), false);
  assert.equal(isValidTransition('ON_HOLD', 'QUALIFIED', null), false);
});

test('active statuses can move forward or backward', () => {
  assert.equal(isValidTransition('NEW', 'CONTACTED'), true);
  assert.equal(isValidTransition('CONTACTED', 'NEW'), true);

  assert.equal(isValidTransition('QUALIFIED', 'PROPOSAL'), true);
  assert.equal(isValidTransition('PROPOSAL', 'QUALIFIED'), true);

  assert.equal(isValidTransition('NEGOTIATION', 'CONVERTED'), true);
  assert.equal(isValidTransition('CONVERTED', 'NEGOTIATION'), true);

  assert.equal(isValidTransition('NEGOTIATION', 'LOST'), true);
  assert.equal(isValidTransition('LOST', 'NEGOTIATION'), true);
});
