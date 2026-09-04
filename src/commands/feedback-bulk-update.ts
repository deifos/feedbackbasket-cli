import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand } from '../output/theme.js';
import { requireHighImpactConfirmation } from '../confirmation.js';
import type { OutputWriter } from '../output/writer.js';

const validCloseReasons = new Set(['DUPLICATE', 'NOT_PLANNED', 'COULD_NOT_REPRODUCE', 'NOT_ACTIONABLE', 'NO_LONGER_RELEVANT', 'SPAM', 'OTHER']);

export function createFeedbackBulkUpdateCommand(getWriter: () => OutputWriter): Command {
  return new Command('bulk-update')
    .description('Update status for multiple feedback items at once')
    .requiredOption('--status <status>', 'New status (OPEN, UNDER_REVIEW, PLANNED, IN_PROGRESS, COMPLETE, CLOSED)')
    .option('--close-reason <reason>', 'Reason for closing (DUPLICATE, NOT_PLANNED, COULD_NOT_REPRODUCE, NOT_ACTIONABLE, NO_LONGER_RELEVANT, SPAM, OTHER)')
    .option('--close-note <note>', 'Internal closure note; required when the reason is OTHER')
    .requiredOption('--ids <ids>', 'Comma-separated feedback IDs')
    .option('--yes', 'Confirm the bulk update')
    .action(async (opts) => {
      const writer = getWriter();
      const client = requireClient();

      const ids = opts.ids
        .split(',')
        .map((id: string) => id.trim())
        .filter(Boolean);
      if (ids.length === 0) {
        throw errUsage('At least one ID is required', 'Example: --ids id1,id2,id3');
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
      await requireHighImpactConfirmation(writer, Boolean(opts.yes), `Update ${ids.length} feedback item${ids.length === 1 ? '' : 's'}?`, '--yes is required for a bulk update in machine mode.');

      const result = await client.bulkUpdateStatus(ids, opts.status, {
        closeReason: opts.closeReason,
        closeNote: opts.closeNote,
      });

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Updated ${result.updated} feedback items to ${brand.bold(result.status)}`);
        console.log();
      }

      writer.ok(result, {
        summary: `Updated ${result.updated} items to ${result.status}`,
        breadcrumbs: [{ action: 'List feedback', cmd: 'feedbackbasket feedback list' }],
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
