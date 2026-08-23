import assert from 'node:assert/strict';
import test from 'node:test';
import { isCliTokenFormat } from '../src/auth/login.js';
import { resolveAuthScope } from '../src/commands/auth.js';

test('CLI authentication accepts only CLI credential format', () => {
  assert.equal(isCliTokenFormat(`fb_cli_${'a'.repeat(64)}`), true);
  assert.equal(isCliTokenFormat(`fb_key_${'a'.repeat(64)}`), false);
  assert.equal(isCliTokenFormat('invalid'), false);
});

test('authentication supports read and full access only', () => {
  assert.equal(resolveAuthScope('read'), 'read');
  assert.equal(resolveAuthScope('full'), 'full');
  assert.throws(() => resolveAuthScope('admin'), /Scope must be/);
});
