import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand, divider } from '../output/theme.js';
import { confirm } from '../prompt.js';
import { resolveProject } from '../resolve.js';
import type { MobileIntegrationResponse } from '../types.js';
import type { OutputWriter } from '../output/writer.js';

const BUNDLE_ID_PATTERN = /^[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;
const SAFE_PROJECT_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*(?: [A-Za-z0-9][A-Za-z0-9._-]*)*$/;
const VERIFY_POLL_INTERVAL_MS = 5_000;
const MAX_VERIFY_WAIT_SECONDS = 300;

export function createMobileCommand(getWriter: () => OutputWriter): Command {
  const mobile = new Command('mobile')
    .description('Set up and verify mobile app feedback');

  mobile
    .command('status [project]')
    .description('Show mobile feedback configuration and connection status')
    .option('--include-publishable-key', 'Include the full publishable mobile project key')
    .action(async (projectArg, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, projectArg);
      const ref = projectRef(projectArg, projectId);
      const result = await client.getMobileIntegration(projectId, Boolean(opts.includePublishableKey));

      if (!writer.isMachineOutput()) renderMobileStatus(result);
      writer.ok(result, {
        summary: `Mobile feedback for "${result.project.name}"`,
        breadcrumbs: result.integration
          ? [
              { action: 'Verify SDK connection', cmd: `feedbackbasket mobile verify ${ref}` },
              { action: 'Add a bundle ID', cmd: `feedbackbasket mobile bundle-ids ${ref} --add com.example.app` },
              { action: 'Configure conversations', cmd: `feedbackbasket mobile conversations ${ref} --enable` },
            ]
          : [
              { action: 'Enable mobile feedback', cmd: `feedbackbasket mobile setup ${ref}` },
            ],
      });
    });

  mobile
    .command('setup [project]')
    .description('Enable mobile feedback and add allowed bundle IDs')
    .option('--bundle-id <bundle-id>', 'Allowed iOS bundle ID (repeatable)', collect, [])
    .option('--include-publishable-key', 'Include the full publishable key required to configure the app')
    .action(async (projectArg, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, projectArg);
      const bundleIds = validateBundleIds(opts.bundleId as string[]);
      const result = await client.updateMobileIntegration(
        projectId,
        { enabled: true, addBundleIds: bundleIds },
        Boolean(opts.includePublishableKey),
      );

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Mobile feedback enabled for ${brand.bold(result.project.name)}`);
        if (!opts.includePublishableKey) {
          console.log(`  ${brand.muted('The publishable key is masked. Re-run with --include-publishable-key when configuring the app.')}`);
        }
        console.log();
      }

      const ref = projectRef(projectArg, projectId);
      writer.ok(withSetupGuidance(result), {
        summary: `Mobile feedback ready for "${result.project.name}"`,
        breadcrumbs: [
          { action: 'Check connection', cmd: `feedbackbasket mobile verify ${ref}` },
          { action: 'View mobile status', cmd: `feedbackbasket mobile status ${ref}` },
        ],
      });
    });

  mobile
    .command('bundle-ids [project]')
    .alias('bundle')
    .description('Add or remove allowed iOS bundle IDs')
    .option('--add <bundle-id>', 'Bundle ID to add (repeatable)', collect, [])
    .option('--remove <bundle-id>', 'Bundle ID to remove (repeatable)', collect, [])
    .action(async (projectArg, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const additions = validateBundleIds(opts.add as string[]);
      const removals = validateBundleIds(opts.remove as string[]);
      if (additions.length === 0 && removals.length === 0) {
        throw errUsage(
          'Pass at least one --add or --remove bundle ID',
          'Example: feedbackbasket mobile bundle-ids myapp --add com.example.app',
        );
      }
      const overlap = additions.filter((bundleId) => removals.includes(bundleId));
      if (overlap.length > 0) {
        throw errUsage(`The same bundle ID cannot be added and removed: ${overlap.join(', ')}`);
      }

      const projectId = await resolveProjectId(client, projectArg);
      const result = await client.updateMobileIntegration(projectId, {
        addBundleIds: additions,
        removeBundleIds: removals,
      });

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Allowed bundle IDs updated for ${brand.bold(result.project.name)}`);
        console.log();
      }
      writer.ok(result, {
        summary: `Updated mobile bundle IDs for "${result.project.name}"`,
        breadcrumbs: [
          { action: 'View mobile status', cmd: `feedbackbasket mobile status ${projectRef(projectArg, projectId)}` },
        ],
      });
    });

  mobile
    .command('conversations [project]')
    .description('Enable or disable in-app follow-up replies')
    .option('--enable', 'Let users continue feedback conversations in the app')
    .option('--disable', 'Keep in-app team replies read-only')
    .action(async (projectArg, opts) => {
      if (Boolean(opts.enable) === Boolean(opts.disable)) {
        throw errUsage('Choose either --enable or --disable');
      }

      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, projectArg);
      const allowVisitorReplies = Boolean(opts.enable);
      const result = await client.updateMobileIntegration(projectId, { allowVisitorReplies });

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} In-app conversations ${allowVisitorReplies ? 'enabled' : 'disabled'} for ${brand.bold(result.project.name)}`);
        console.log();
      }
      writer.ok(result, {
        summary: `${allowVisitorReplies ? 'Enabled' : 'Disabled'} in-app follow-up replies for "${result.project.name}"`,
        breadcrumbs: [
          { action: 'View mobile status', cmd: `feedbackbasket mobile status ${projectRef(projectArg, projectId)}` },
        ],
      });
    });

  mobile
    .command('verify [project]')
    .description('Verify that the SDK has connected from the expected app')
    .option('--bundle-id <bundle-id>', 'Expected bundle ID')
    .option('--wait <seconds>', 'Wait for the first matching heartbeat (maximum 300 seconds)', '0')
    .action(async (projectArg, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, projectArg);
      const expectedBundleId = opts.bundleId
        ? validateBundleIds([opts.bundleId as string])[0]
        : undefined;
      const waitSeconds = parseWaitSeconds(opts.wait as string);
      const deadline = Date.now() + waitSeconds * 1_000;
      let result = await client.getMobileIntegration(projectId);

      while (!isMobileConnectionVerified(result, expectedBundleId) && Date.now() < deadline) {
        await sleep(Math.min(VERIFY_POLL_INTERVAL_MS, deadline - Date.now()));
        result = await client.getMobileIntegration(projectId);
      }

      const verified = isMobileConnectionVerified(result, expectedBundleId);
      const verification = {
        verified,
        expectedBundleId: expectedBundleId ?? null,
        project: result.project,
        integration: result.integration,
      };

      if (!writer.isMachineOutput()) renderVerification(verification);
      writer.ok(verification, {
        summary: verified
          ? `Verified mobile connection for "${result.project.name}"`
          : `Mobile connection not yet verified for "${result.project.name}"`,
        notice: verified
          ? undefined
          : 'Build and launch the app, then run this command again with --wait 120.',
      });

      if (!verified) process.exitCode = 2;
    });

  mobile
    .command('disable [project]')
    .description('Disable mobile feedback without changing the website widget')
    .option('--yes', 'Confirm disabling mobile feedback')
    .action(async (projectArg, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, projectArg);
      await requireDestructiveConfirmation(
        writer,
        Boolean(opts.yes),
        'Disable mobile feedback? Installed apps will stop submitting feedback.',
        '--yes is required to disable mobile feedback in agent mode',
      );
      const result = await client.updateMobileIntegration(projectId, { enabled: false });
      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Mobile feedback disabled for ${brand.bold(result.project.name)}`);
        console.log();
      }
      writer.ok(result, {
        summary: `Disabled mobile feedback for "${result.project.name}"`,
        breadcrumbs: [
          { action: 'Re-enable mobile feedback', cmd: `feedbackbasket mobile setup ${projectRef(projectArg, projectId)}` },
        ],
      });
    });

  mobile
    .command('rotate-key [project]')
    .description('Rotate the publishable mobile key (existing app builds will stop working)')
    .option('--yes', 'Confirm key rotation')
    .option('--include-publishable-key', 'Include the newly generated publishable key')
    .action(async (projectArg, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, projectArg);
      await requireDestructiveConfirmation(
        writer,
        Boolean(opts.yes),
        'Rotate the mobile project key? Existing app builds will stop submitting feedback.',
        '--yes is required to rotate a mobile project key in agent mode',
      );
      const result = await client.rotateMobileProjectKey(
        projectId,
        Boolean(opts.includePublishableKey),
      );
      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.warning('!')} Mobile project key rotated for ${brand.bold(result.project.name)}`);
        console.log('  Update and release every installed app that used the previous key.');
        console.log();
      }
      writer.ok(result, {
        summary: `Rotated mobile project key for "${result.project.name}"`,
        notice: 'Existing app builds using the previous key can no longer submit feedback.',
      });
    });

  return mobile;
}

function requireClient(): FeedbackBasketClient {
  const manager = new AuthManager();
  const token = manager.resolveToken();
  if (!token) throw errAuth();
  return new FeedbackBasketClient(token, loadConfig().baseUrl);
}

async function resolveProjectId(client: FeedbackBasketClient, projectArg?: string): Promise<string> {
  if (projectArg) return (await resolveProject(client, projectArg)).id;
  const config = loadConfig();
  if (config.defaultProject) return config.defaultProject;
  throw errUsage(
    'Project is required. Pass a project name/ID or set a default.',
    'feedbackbasket mobile status <project>',
  );
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

export function projectRef(projectArg: string | undefined, projectId: string): string {
  const ref = projectArg?.trim();
  if (!ref || !SAFE_PROJECT_REF_PATTERN.test(ref)) return projectId;
  return ref.includes(' ') ? `"${ref}"` : ref;
}

export function validateBundleIds(bundleIds: string[]): string[] {
  const normalized = Array.from(new Set(bundleIds.map((value) => value.trim()).filter(Boolean)));
  const invalid = normalized.find((bundleId) => !BUNDLE_ID_PATTERN.test(bundleId));
  if (invalid) {
    throw errUsage(`Invalid bundle ID "${invalid}"`, 'Bundle IDs must look like com.example.app');
  }
  if (normalized.length > 20) throw errUsage('A project can have at most 20 bundle IDs');
  return normalized;
}

export function isMobileConnectionVerified(
  result: MobileIntegrationResponse,
  expectedBundleId?: string,
): boolean {
  const integration = result.integration;
  if (!integration?.enabled || !integration.connection.connected) return false;
  return !expectedBundleId || integration.connection.bundleId === expectedBundleId;
}

function parseWaitSeconds(value: string): number {
  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds < 0 || seconds > MAX_VERIFY_WAIT_SECONDS) {
    throw errUsage(`--wait must be a whole number between 0 and ${MAX_VERIFY_WAIT_SECONDS}`);
  }
  return seconds;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, milliseconds)));
}

async function requireDestructiveConfirmation(
  writer: OutputWriter,
  confirmedByFlag: boolean,
  question: string,
  agentHint: string,
): Promise<void> {
  if (confirmedByFlag) return;
  if (writer.isMachineOutput() || !process.stdin.isTTY) {
    throw errUsage(agentHint);
  }
  if (!(await confirm(`  ${question}`, false))) {
    throw errUsage('Action cancelled');
  }
}

function withSetupGuidance(result: MobileIntegrationResponse) {
  return {
    ...result,
    setup: {
      publishableKeyIncluded: result.integration?.publishableKeyIncluded ?? false,
      supportedIntegrations: ['swiftui', 'uikit', 'react-native', 'flutter', 'hosted-form'],
      nextSteps: result.integration?.publishableKeyIncluded
        ? [
            'Detect the mobile framework and minimum supported platform version.',
            'Configure the app with the returned publishable mobile project key.',
            'Add an accessible Send feedback action to an existing Settings, Help, or Support screen.',
            'Build and launch the app, then verify its SDK heartbeat.',
          ]
        : [
            'Re-run setup with --include-publishable-key when you are ready to configure the app.',
          ],
    },
  };
}

function renderMobileStatus(result: MobileIntegrationResponse): void {
  console.log(brand.bold(`Mobile feedback — ${result.project.name}`));
  console.log(divider(54));
  if (!result.integration) {
    console.log(brand.muted('  Mobile feedback is not enabled.'));
    console.log();
    return;
  }
  const integration = result.integration;
  console.log(`  ${brand.label('Status'.padEnd(18))} ${integration.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  ${brand.label('Conversations'.padEnd(18))} ${integration.allowVisitorReplies ? 'Enabled' : 'Read-only'}`);
  console.log(`  ${brand.label('Publishable key'.padEnd(18))} ${integration.publishableKey}`);
  console.log(`  ${brand.label('Bundle IDs'.padEnd(18))} ${integration.bundleIds.join(', ') || 'Any bundle ID'}`);
  console.log(`  ${brand.label('Connection'.padEnd(18))} ${integration.connection.connected ? 'Connected' : 'Waiting for first heartbeat'}`);
  if (integration.connection.lastSeenAt) {
    console.log(`  ${brand.label('Last seen'.padEnd(18))} ${integration.connection.lastSeenAt}`);
  }
  if (integration.connection.bundleId) {
    console.log(`  ${brand.label('Last bundle'.padEnd(18))} ${integration.connection.bundleId}`);
  }
  console.log();
}

function renderVerification(result: {
  verified: boolean;
  expectedBundleId: string | null;
  project: MobileIntegrationResponse['project'];
  integration: MobileIntegrationResponse['integration'];
}): void {
  const icon = result.verified ? brand.success('✓') : brand.warning('!');
  console.log(`  ${icon} ${result.verified ? 'Mobile SDK connection verified' : 'Mobile SDK connection not yet verified'}`);
  if (result.expectedBundleId) console.log(`  ${brand.muted(`Expected bundle: ${result.expectedBundleId}`)}`);
  if (result.integration?.connection.lastSeenAt) {
    console.log(`  ${brand.muted(`Last heartbeat: ${result.integration.connection.lastSeenAt}`)}`);
  }
  console.log();
}
