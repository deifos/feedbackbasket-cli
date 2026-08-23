import assert from 'node:assert/strict';
import test from 'node:test';
import { PRODUCT_OPERATIONS } from 'feedbackbasket-agent-contract';
import { FeedbackBasketClient } from '../src/client.js';

type ExpectedCall = { method: string; path: string };

test('every product operation uses its contract HTTP method and path', async () => {
  const originalFetch = globalThis.fetch;
  const calls: ExpectedCall[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ method: String(init?.method), path: `${url.pathname}${url.search}` });
    return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;

  try {
    const client = new FeedbackBasketClient('test-credential', 'https://feedbackbasket.test');
    await client.listProjects();
    await client.getProject('project');
    await client.createProject({ name: 'Project', url: 'https://example.test' });
    await client.updateProject('project', { name: 'New name' });
    await client.deleteProject('project');
    await client.getFeedback();
    await client.getFeedbackById('feedback');
    await client.searchFeedback('query');
    await client.createFeedback({ projectId: 'project', content: 'Content' });
    await client.updateFeedback('feedback', { status: 'OPEN' });
    await client.deleteFeedback('feedback');
    await client.bulkUpdateStatus(['feedback'], 'OPEN');
    await client.exportFeedback('project');
    await client.getBugReports();
    await client.getBugStats();
    await client.createNote('feedback', 'Content');
    await client.updateNote('feedback', 'note', 'Content');
    await client.deleteNote('feedback', 'note');
    await client.listReplies('feedback');
    await client.sendReply('feedback', 'Content');
    await client.getWidgetSettings('project');
    await client.updateWidgetSettings('project', {});
    await client.getWidgetScript('project');
    await client.getMobileIntegration('project');
    await client.updateMobileIntegration('project', {});
    await client.rotateMobileProjectKey('project');
    await client.getWaitlist('project');
    await client.exportWaitlist('project');
    await client.listTeam();
    await client.updateMemberRole('member', 'admin');
    await client.removeMember('member');
  } finally {
    globalThis.fetch = originalFetch;
  }

  const expected = PRODUCT_OPERATIONS.map((operation) => ({
    method: operation.http.method,
    path: operation.http.path
      .replace('{projectId}', 'project')
      .replace('{feedbackId}', 'feedback')
      .replace('{noteId}', 'note')
      .replace('{memberId}', 'member')
      .replace('/api/v1/feedback', operation.id === 'feedback.search' ? '/api/v1/feedback?search=query' : '/api/v1/feedback')
      .replace('/api/v1/projects/project/export', '/api/v1/projects/project/export?format=csv'),
  }));
  assert.deepEqual(calls, expected);
});

test('the client returns stable errors for access and service failures', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const [status, code] of [[401, 'auth_error'], [403, 'forbidden'], [429, 'rate_limit'], [500, 'api_error']] as const) {
      globalThis.fetch = (async () => new Response('{"error":"Request failed"}', {
        status,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;
      await assert.rejects(
        new FeedbackBasketClient('test-credential', 'https://feedbackbasket.test').listProjects(),
        (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error && error.code === code),
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
