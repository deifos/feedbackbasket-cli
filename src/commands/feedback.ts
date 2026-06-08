import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth } from '../output/errors.js';
import { brand } from '../output/theme.js';
import { resolveProject } from '../resolve.js';
import type { OutputWriter } from '../output/writer.js';
import type { Feedback, FeedbackCategory, FeedbackStatus, Sentiment } from '../types.js';

async function resolveProjectId(client: FeedbackBasketClient, optProject?: string, all?: boolean): Promise<string | undefined> {
  if (all) return undefined;
  if (optProject) {
    const project = await resolveProject(client, optProject);
    return project.id;
  }
  const config = loadConfig();
  return config.defaultProject;
}
import { createFeedbackUpdateCommand } from './feedback-update.js';
import { createFeedbackNoteCommand } from './feedback-note.js';
import { createFeedbackDeleteCommand } from './feedback-delete.js';
import { createFeedbackBulkUpdateCommand } from './feedback-bulk-update.js';
import { createFeedbackExportCommand } from './feedback-export.js';
import { createFeedbackReplyCommand, createFeedbackRepliesCommand } from './feedback-reply.js';

export function createFeedbackCommand(getWriter: () => OutputWriter): Command {
  const feedback = new Command('feedback')
    .description('View and manage feedback');

  // Write subcommands
  feedback.addCommand(createFeedbackUpdateCommand(getWriter));
  feedback.addCommand(createFeedbackNoteCommand(getWriter));
  feedback.addCommand(createFeedbackReplyCommand(getWriter));
  feedback.addCommand(createFeedbackRepliesCommand(getWriter));
  feedback.addCommand(createFeedbackDeleteCommand(getWriter));
  feedback.addCommand(createFeedbackBulkUpdateCommand(getWriter));
  feedback.addCommand(createFeedbackExportCommand(getWriter));

  // --- feedback list ---
  feedback
    .command('list')
    .description('List feedback with optional filters')
    .option('--project <id>', 'Filter by project ID')
    .option('--all', 'Show feedback across all projects (ignore default project)')
    .option('--category <category>', 'Filter by category (BUG, FEATURE_REQUEST, IMPROVEMENT, QUESTION)')
    .option('--status <status>', 'Filter by status (OPEN, UNDER_REVIEW, PLANNED, IN_PROGRESS, COMPLETE, CLOSED)')
    .option('--sentiment <sentiment>', 'Filter by sentiment (POSITIVE, NEGATIVE, NEUTRAL)')
    .option('--search <query>', 'Search feedback content')
    .option('--limit <n>', 'Max results (1-100)', '20')
    .option('--offset <n>', 'Offset for pagination', '0')
    .option('--notes', 'Include internal notes')
    .action(async (opts) => {
      const writer = getWriter();
      const client = requireClient();

      const result = await client.getFeedback({
        projectId: await resolveProjectId(client, opts.project, opts.all),
        category: opts.category as FeedbackCategory | undefined,
        status: opts.status as FeedbackStatus | undefined,
        sentiment: opts.sentiment as Sentiment | undefined,
        search: opts.search,
        limit: parseInt(opts.limit, 10),
        offset: parseInt(opts.offset, 10),
        includeNotes: opts.notes ?? false,
      });

      if (!writer.isMachineOutput()) {
        renderFeedbackList(result.feedback);
      }

      const breadcrumbs = [];
      if (opts.project) {
        breadcrumbs.push({ action: 'View bugs for this project', cmd: `feedbackbasket bugs list --project ${opts.project}` });
      }
      if (result.pagination.hasMore) {
        const nextOffset = parseInt(opts.offset, 10) + parseInt(opts.limit, 10);
        breadcrumbs.push({ action: 'Next page', cmd: `feedbackbasket feedback list --offset ${nextOffset} --limit ${opts.limit}${opts.project ? ` --project ${opts.project}` : ''}` });
      }
      breadcrumbs.push({ action: 'Search', cmd: 'feedbackbasket feedback search "<query>"' });

      writer.ok(result.feedback, {
        summary: `Showing ${result.feedback.length} of ${result.pagination.totalCount} feedback items`,
        notice: result.pagination.hasMore ? `Use --offset ${parseInt(opts.offset, 10) + parseInt(opts.limit, 10)} to see more` : undefined,
        breadcrumbs,
      });
    });

  // --- feedback show ---
  feedback
    .command('show <id>')
    .description('Show a single feedback item in detail')
    .action(async (id) => {
      const writer = getWriter();
      const client = requireClient();

      const item = await client.getFeedbackById(id);

      if (!writer.isMachineOutput()) {
        renderFeedbackDetail(item);
      }

      writer.ok(item, {
        summary: `Feedback ${item.id}`,
        breadcrumbs: [
          { action: 'Update status', cmd: `feedbackbasket feedback update ${item.id} --status <STATUS>` },
          { action: 'Add note', cmd: `feedbackbasket feedback note ${item.id} "<note>"` },
          { action: 'Back to list', cmd: 'feedbackbasket feedback list' },
        ],
      });
    });

  // --- feedback search ---
  feedback
    .command('search <query>')
    .description('Search feedback content across projects')
    .option('--project <id>', 'Limit to a specific project')
    .option('--category <category>', 'Filter by category')
    .option('--limit <n>', 'Max results (1-50)', '10')
    .action(async (query, opts) => {
      const writer = getWriter();
      const client = requireClient();

      const result = await client.searchFeedback(query, {
        projectId: await resolveProjectId(client, opts.project),
        category: opts.category,
        limit: parseInt(opts.limit, 10),
      });

      if (!writer.isMachineOutput()) {
        renderFeedbackList(result.feedback);
      }

      writer.ok(result.feedback, {
        summary: `${result.pagination.totalCount} result${result.pagination.totalCount === 1 ? '' : 's'} for "${query}"`,
        breadcrumbs: [
          { action: 'List all feedback', cmd: 'feedbackbasket feedback list' },
          { action: 'Search bugs', cmd: `feedbackbasket bugs list --search "${query}"` },
        ],
      });
    });

  return feedback;
}

function requireClient(): FeedbackBasketClient {
  const manager = new AuthManager();
  const token = manager.resolveToken();
  if (!token) throw errAuth();
  const config = loadConfig();
  return new FeedbackBasketClient(token, config.baseUrl);
}

const categoryEmoji: Record<string, string> = {
  BUG: brand.bug('[BUG]'),
  FEATURE_REQUEST: brand.feature('[FEATURE]'),
  IMPROVEMENT: brand.improvement('[IMPROVE]'),
  QUESTION: brand.question('[QUESTION]'),
};

const priorityLabel = (score: number | null | undefined): string => {
  if (score == null) return brand.muted('--');
  if (score >= 70) return brand.high(`P${score}`);
  if (score >= 40) return brand.medium(`P${score}`);
  return brand.low(`P${score}`);
};

function renderFeedbackList(items: Feedback[]): void {
  if (items.length === 0) return;

  for (const item of items) {
    const cat = categoryEmoji[item.category ?? ''] ?? brand.muted('[?]');
    const priority = priorityLabel(item.aiPriorityScore);
    const content = item.content.length > 80 ? item.content.slice(0, 77) + '...' : item.content;
    const status = brand.muted(`[${item.status}]`);

    const proj = item.project ? brand.primary(item.project.name) : '';
    console.log(`${cat} ${priority} ${status} ${proj} ${brand.muted(item.id)}`);
    console.log(`  ${content}`);
    if (item.aiSummary) {
      console.log(`  ${brand.hint(item.aiSummary)}`);
    }
    if (item.attachments && item.attachments.length > 0) {
      console.log(`  ${brand.muted(`${item.attachments.length} attachment${item.attachments.length === 1 ? '' : 's'}`)}`);
    }
    console.log();
  }
}

function renderFeedbackDetail(item: Feedback): void {
  console.log(brand.bold(`Feedback ${item.id}`));
  console.log(brand.divider('─'.repeat(50)));
  console.log();

  const fields: [string, string | null | undefined][] = [
    ['Status', item.status],
    ['Category', item.category],
    ['Feedback Type', formatFeedbackType(item)],
    ['Sentiment', item.sentiment],
    ['Priority', item.aiPriorityScore != null ? String(item.aiPriorityScore) : null],
    ['Email', item.email],
    ['Project', `${item.project.name} (${item.project.id})`],
    ['Page URL', item.pageUrl],
    ['Browser', item.browser],
    ['OS', item.os],
    ['Device', item.device],
    ['Language', item.language],
    ['Created', item.createdAt],
  ];

  for (const [label, value] of fields) {
    if (value) {
      console.log(`  ${brand.bold(label.padEnd(12))} ${value}`);
    }
  }

  console.log();
  console.log(brand.bold('Content:'));
  console.log(`  ${item.content}`);

  if (item.followUpAnswers && item.followUpAnswers.length > 0) {
    console.log();
    console.log(brand.bold('Follow-up Answers:'));
    for (const answer of item.followUpAnswers) {
      const value = answer.value?.trim() || brand.muted('(skipped)');
      console.log(`  ${brand.bold(answer.label)}`);
      console.log(`    ${value}`);
    }
  }

  if (item.attachments && item.attachments.length > 0) {
    console.log();
    console.log(brand.bold(`Attachments (${item.attachments.length}):`));
    for (const attachment of item.attachments) {
      const size = typeof attachment.size === 'number' ? ` ${brand.muted(formatBytes(attachment.size))}` : '';
      const type = attachment.mimeType ? ` ${brand.muted(attachment.mimeType)}` : '';
      console.log(`  ${brand.bold(attachment.filename)}${size}${type}`);
      console.log(`    ${attachment.url}`);
    }
  }

  if (item.aiSummary) {
    console.log();
    console.log(brand.bold('AI Summary:'));
    console.log(`  ${brand.hint(item.aiSummary)}`);
  }

  if (item.reasoning) {
    console.log();
    console.log(brand.bold('AI Reasoning:'));
    console.log(`  ${brand.hint(item.reasoning)}`);
  }

  if (item.notes && item.notes.length > 0) {
    console.log();
    console.log(brand.bold(`Notes (${item.notes.length}):`));
    for (const note of item.notes) {
      console.log(`  ${brand.muted(note.createdAt)} ${brand.primary(note.author.name)}`);
      console.log(`    ${note.content}`);
    }
  }
}

function formatFeedbackType(item: Feedback): string | undefined {
  if (!item.feedbackType) return undefined;
  const label = item.feedbackType.label || item.feedbackType.id;
  if (!label) return undefined;
  return item.feedbackType.emoji ? `${item.feedbackType.emoji} ${label}` : label;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
}
