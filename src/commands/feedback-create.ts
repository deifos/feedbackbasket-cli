import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand } from '../output/theme.js';
import { resolveProject } from '../resolve.js';
import type { OutputWriter } from '../output/writer.js';
import type { FeedbackCategory, FeedbackStatus } from '../types.js';

type FeedbackType = 'bug' | 'feature' | 'general';

const validTypes = new Set(['bug', 'feature', 'general']);
const validCategories = new Set(['BUG', 'FEATURE_REQUEST', 'IMPROVEMENT', 'QUESTION']);
const validStatuses = new Set(['OPEN', 'UNDER_REVIEW', 'PLANNED', 'IN_PROGRESS', 'COMPLETE', 'CLOSED']);
const validCloseReasons = new Set(['DUPLICATE', 'NOT_PLANNED', 'COULD_NOT_REPRODUCE', 'NOT_ACTIONABLE', 'NO_LONGER_RELEVANT', 'SPAM', 'OTHER']);

export function createFeedbackCreateCommand(getWriter: () => OutputWriter): Command {
  return new Command('create')
    .argument('<title>', 'Short title or summary for the feedback')
    .description('Create a new feedback item')
    .requiredOption('--project <id-or-name>', 'Project ID or name')
    .option('--content <body>', 'Longer feedback body')
    .option('--type <type>', 'Feedback type (bug, feature, general)')
    .option('--category <category>', 'Category (BUG, FEATURE_REQUEST, IMPROVEMENT, QUESTION)')
    .option('--status <status>', 'Initial status (OPEN, UNDER_REVIEW, PLANNED, IN_PROGRESS, COMPLETE, CLOSED)')
    .option('--close-reason <reason>', 'Reason when the initial status is CLOSED')
    .option('--close-note <note>', 'Internal closure note; required when the reason is OTHER')
    .option('--email <email>', 'Submitter email')
    .option('--page-url <url>', 'Page URL where the feedback applies')
    .option('--metadata <key=value>', 'Metadata key/value pair (repeatable)', collectMetadata, [] as string[])
    .action(async (title, opts) => {
      const writer = getWriter();
      const client = requireClient();

      if (opts.type && !validTypes.has(opts.type)) {
        throw errUsage('Invalid type. Must be one of: bug, feature, general', 'Example: feedbackbasket feedback create "Login is broken" --project myapp --type bug');
      }
      if (opts.category && !validCategories.has(opts.category)) {
        throw errUsage('Invalid category. Must be one of: BUG, FEATURE_REQUEST, IMPROVEMENT, QUESTION');
      }
      if (opts.status && !validStatuses.has(opts.status)) {
        throw errUsage('Invalid status. Must be one of: OPEN, UNDER_REVIEW, PLANNED, IN_PROGRESS, COMPLETE, CLOSED');
      }
      if (opts.status === 'CLOSED' && !opts.closeReason) {
        throw errUsage('--close-reason is required when status is CLOSED');
      }
      if (opts.closeReason && !validCloseReasons.has(opts.closeReason)) {
        throw errUsage('Invalid close reason. Must be one of: DUPLICATE, NOT_PLANNED, COULD_NOT_REPRODUCE, NOT_ACTIONABLE, NO_LONGER_RELEVANT, SPAM, OTHER');
      }
      if (opts.closeReason === 'OTHER' && !opts.closeNote?.trim()) {
        throw errUsage('--close-note is required when --close-reason is OTHER');
      }

      const project = await resolveProject(client, opts.project);
      const content = composeContent(title, opts.content);
      const metadata = parseMetadata(opts.metadata ?? []);

      const result = await client.createFeedback({
        projectId: project.id,
        content,
        type: opts.type as FeedbackType | undefined,
        category: opts.category as FeedbackCategory | undefined,
        status: opts.status as FeedbackStatus | undefined,
        closeReason: opts.closeReason,
        closeNote: opts.closeNote,
        email: opts.email,
        pageUrl: opts.pageUrl,
        metadata,
      });

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('[OK]')} Feedback created: ${brand.bold(result.id)}`);
        console.log(`    ${brand.muted('Project:')} ${project.name}`);
        console.log(`    ${brand.muted('URL:')} ${result.url}`);
        console.log();
      }

      writer.ok(result, {
        summary: `Created feedback ${result.id}`,
        breadcrumbs: [
          {
            action: 'View feedback',
            cmd: `feedbackbasket feedback show ${result.id}`,
          },
          {
            action: 'Update status',
            cmd: `feedbackbasket feedback update ${result.id} --status UNDER_REVIEW`,
          },
          {
            action: 'List project feedback',
            cmd: `feedbackbasket feedback list --project ${project.id}`,
          },
        ],
      });
    });
}

function requireClient(): FeedbackBasketClient {
  const manager = new AuthManager();
  const token = manager.resolveToken();
  if (!token) throw errAuth();
  const config = loadConfig();
  return new FeedbackBasketClient(token, config.baseUrl);
}

function composeContent(title: string, body?: string): string {
  const cleanTitle = title.trim();
  const cleanBody = body?.trim();
  const content = cleanBody ? `${cleanTitle}\n\n${cleanBody}` : cleanTitle;

  if (!content) {
    throw errUsage('Feedback title is required');
  }
  if (content.length > 2000) {
    throw errUsage('Feedback content must be 2000 characters or less');
  }

  return content;
}

function collectMetadata(value: string, previous: string[]): string[] {
  return previous.concat(value);
}

function parseMetadata(entries: string[]): Record<string, unknown> | undefined {
  if (entries.length === 0) return undefined;

  const metadata: Record<string, unknown> = {};
  for (const entry of entries) {
    const separator = entry.indexOf('=');
    if (separator <= 0) {
      throw errUsage(`Invalid metadata "${entry}"`, 'Use --metadata key=value, for example --metadata source=codex');
    }

    const key = entry.slice(0, separator).trim();
    const rawValue = entry.slice(separator + 1).trim();
    if (!key) {
      throw errUsage('Metadata keys cannot be empty');
    }
    metadata[key] = parseMetadataValue(rawValue);
  }

  return metadata;
}

function parseMetadataValue(value: string): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (value !== '' && Number.isFinite(Number(value))) return Number(value);

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
