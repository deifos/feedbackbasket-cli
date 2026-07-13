import assert from 'node:assert/strict';
import test from 'node:test';
import { replyDestinations } from '../src/commands/feedback-reply.js';

test('in-app replies use the existing authenticated thread destination', () => {
  assert.deepEqual(replyDestinations('in-app'), ['widget']);
  assert.deepEqual(replyDestinations('widget'), ['widget']);
  assert.deepEqual(replyDestinations('email'), ['email']);
  assert.deepEqual(replyDestinations('both'), ['email', 'widget']);
});
