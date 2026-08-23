import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand } from '../output/theme.js';
import { requireHighImpactConfirmation } from '../confirmation.js';
import type { OutputWriter } from '../output/writer.js';

export function createFeedbackBulkUpdateCommand(getWriter: () => OutputWriter): Command {
  return new Command('bulk-update')
    .description('Update status for multiple feedback items at once')
    .requiredOption('--status <status>', 'New status (OPEN, UNDER_REVIEW, PLANNED, IN_PROGRESS, COMPLETE, CLOSED)')
    .requiredOption('--ids <ids>', 'Comma-separated feedback IDs')
    .option('--yes', 'Confirm the bulk update')
    .action(async (opts) => {
      const writer = getWriter();
      const client = requireClient();

      const ids = opts.ids.split(',').map((id: string) => id.trim()).filter(Boolean);
      if (ids.length === 0) {
        throw errUsage('At least one ID is required', 'Example: --ids id1,id2,id3');
      }
      await requireHighImpactConfirmation(
        writer,
        Boolean(opts.yes),
        `Update ${ids.length} feedback item${ids.length === 1 ? '' : 's'}?`,
        '--yes is required for a bulk update in machine mode.',
      );

      const result = await client.bulkUpdateStatus(ids, opts.status);

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Updated ${result.updated} feedback items to ${brand.bold(result.status)}`);
        console.log();
      }

      writer.ok(result, {
        summary: `Updated ${result.updated} items to ${result.status}`,
        breadcrumbs: [
          { action: 'List feedback', cmd: 'feedbackbasket feedback list' },
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
