import assert from 'node:assert/strict';
import test from 'node:test';
import { requireHighImpactConfirmation } from '../src/confirmation.js';
import { Format, OutputWriter } from '../src/output/writer.js';

test('machine output requires --yes for a high-impact action', async () => {
  const writer = new OutputWriter({ format: Format.JSON });
  await assert.rejects(
    requireHighImpactConfirmation(writer, false, 'Continue?', '--yes is required.'),
    (error: unknown) => Boolean(
      error && typeof error === 'object' && 'code' in error && error.code === 'usage_error'
      && 'hint' in error && String(error.hint).includes('--yes'),
    ),
  );
});

test('--yes permits a high-impact action in machine output', async () => {
  const writer = new OutputWriter({ format: Format.JSON });
  await requireHighImpactConfirmation(writer, true, 'Continue?', '--yes is required.');
  assert.ok(true);
});
