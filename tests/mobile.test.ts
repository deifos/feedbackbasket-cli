import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isMobileConnectionVerified,
  projectRef,
  validateBundleIds,
} from '../src/commands/mobile.js';
import type { MobileIntegrationResponse } from '../src/types.js';
import { FeedbackBasketClient } from '../src/client.js';

function response(overrides: Partial<MobileIntegrationResponse['integration']> = {}): MobileIntegrationResponse {
  return {
    project: { id: 'project-1', name: 'Example', url: 'https://example.com' },
    integration: {
      enabled: true,
      allowVisitorReplies: true,
      publishableKey: 'fb_mobile_abcd••••••••••••',
      publishableKeyIncluded: false,
      hostedFormUrl: null,
      bundleIds: ['com.example.app'],
      connection: {
        connected: true,
        lastSeenAt: '2026-07-13T12:00:00.000Z',
        platform: 'ios',
        sdkVersion: '1.0.0',
        bundleId: 'com.example.app',
      },
      ...overrides,
    },
    sdk: {
      swiftPackageUrl: 'https://github.com/deifos/feedbackbasket-swift.git',
      minimumIOSVersion: '16.0',
      productionBaseUrl: 'https://feedbackbasket.com',
    },
  };
}

test('bundle IDs are validated, deduplicated, and kept in order', () => {
  assert.deepEqual(
    validateBundleIds([' com.example.app ', 'com.example.app', 'com.example.beta']),
    ['com.example.app', 'com.example.beta'],
  );
  assert.throws(() => validateBundleIds(['not-a-bundle-id']), /Invalid bundle ID/);
});

test('verification requires an enabled connection and matching bundle when supplied', () => {
  const connected = response();
  assert.equal(isMobileConnectionVerified(connected), true);
  assert.equal(isMobileConnectionVerified(connected, 'com.example.app'), true);
  assert.equal(isMobileConnectionVerified(connected, 'com.example.other'), false);
  assert.equal(
    isMobileConnectionVerified(response({ enabled: false }), 'com.example.app'),
    false,
  );
});

test('breadcrumb project references fall back to the resolved ID for unsafe shell input', () => {
  assert.equal(projectRef('Acme iOS', 'project-1'), '"Acme iOS"');
  assert.equal(projectRef('acme-ios', 'project-1'), 'acme-ios');
  assert.equal(projectRef('Acme $(whoami)', 'project-1'), 'project-1');
  assert.equal(projectRef('Acme `whoami`', 'project-1'), 'project-1');
  assert.equal(projectRef('Acme "iOS"', 'project-1'), 'project-1');
  assert.equal(projectRef('--help', 'project-1'), 'project-1');
  assert.equal(projectRef(undefined, 'project-1'), 'project-1');
});

test('mobile client endpoints include publishable keys only when explicitly requested', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    return new Response(JSON.stringify(response()), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const client = new FeedbackBasketClient('fb_cli_test', 'https://feedbackbasket.test');
    await client.getMobileIntegration('project/one');
    await client.updateMobileIntegration(
      'project/one',
      { enabled: true, allowVisitorReplies: false, addBundleIds: ['com.example.app'] },
      true,
    );
    await client.rotateMobileProjectKey('project/one', true);
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(
    calls[0]?.url,
    'https://feedbackbasket.test/api/v1/projects/project%2Fone/mobile',
  );
  assert.equal(
    calls[1]?.url,
    'https://feedbackbasket.test/api/v1/projects/project%2Fone/mobile?includePublishableKey=true',
  );
  assert.equal(calls[1]?.init?.method, 'PATCH');
  assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
    enabled: true,
    allowVisitorReplies: false,
    addBundleIds: ['com.example.app'],
  });
  assert.equal(
    calls[2]?.url,
    'https://feedbackbasket.test/api/v1/projects/project%2Fone/mobile/rotate-key?includePublishableKey=true',
  );
  assert.equal(calls[2]?.init?.method, 'POST');
});
