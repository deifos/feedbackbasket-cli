import assert from 'node:assert/strict';
import test from 'node:test';
import { createCommunityCommand, createFeedbackVotesCommand } from '../src/commands/community.js';
import type { OutputWriter } from '../src/output/writer.js';

test('community commands preserve false, zero, null, arrays, and vote pagination', async () => {
  const oldFetch = globalThis.fetch; const oldToken = process.env.FEEDBACKBASKET_TOKEN;
  const calls: { url: URL; method: string; body: unknown }[] = [];
  process.env.FEEDBACKBASKET_TOKEN = 'test-community-token';
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url: new URL(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const result = String(url).endsWith('/projects') ? { projects: [{ id: 'project', name: 'Example' }] } : { total: 3, page: 2, limit: 1 };
    return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
  const results: unknown[] = [];
  const writer = { isMachineOutput: () => true, ok: (value: unknown) => results.push(value) } as unknown as OutputWriter;
  try {
    await createCommunityCommand('boards', () => writer).parseAsync(['update', '--project', 'Example', '--board-enabled', 'false', '--visible-statuses', 'OPEN,PLANNED', '--yes'], { from: 'user' });
    assert.deepEqual(calls.at(-1)?.body, { boardEnabled: false, visibleStatuses: ['OPEN', 'PLANNED'] });
    await createCommunityCommand('roadmap', () => writer).parseAsync(['update', 'card', '--project', 'Example', '--status', 'IN_PROGRESS', '--position', '0', '--notes', 'null'], { from: 'user' });
    assert.deepEqual(calls.at(-1)?.body, { status: 'IN_PROGRESS', position: 0, notes: null });
    await createFeedbackVotesCommand(() => writer).parseAsync(['feedback', '--page', '2', '--limit', '1'], { from: 'user' });
    assert.equal(calls.at(-1)?.url.search, '?page=2&limit=1');
    assert.deepEqual(results.at(-1), { total: 3, page: 2, limit: 1 });
    await assert.rejects(createCommunityCommand('boards', () => writer).parseAsync(['update', '--project', 'Example', '--board-enabled', 'true'], { from: 'user' }), /Review|confirm/i);
  } finally { globalThis.fetch = oldFetch; if (oldToken === undefined) delete process.env.FEEDBACKBASKET_TOKEN; else process.env.FEEDBACKBASKET_TOKEN = oldToken; }
});
