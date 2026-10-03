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

test('valid active-status transitions remain allowed', () => {
  assert.equal(isValidTransition('NEW', 'CONTACTED'), true);
  assert.equal(isValidTransition('NEGOTIATION', 'CONVERTED'), true);
  assert.equal(isValidTransition('NEGOTIATION', 'LOST'), true);
});
