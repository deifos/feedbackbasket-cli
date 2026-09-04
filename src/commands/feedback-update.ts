import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand } from '../output/theme.js';
import type { OutputWriter } from '../output/writer.js';

const validCloseReasons = new Set(['DUPLICATE', 'NOT_PLANNED', 'COULD_NOT_REPRODUCE', 'NOT_ACTIONABLE', 'NO_LONGER_RELEVANT', 'SPAM', 'OTHER']);

export function createFeedbackUpdateCommand(getWriter: () => OutputWriter): Command {
  return new Command('update')
    .argument('<id>', 'Feedback ID to update')
    .description('Update a feedback item')
    .option('--status <status>', 'Set status (OPEN, UNDER_REVIEW, PLANNED, IN_PROGRESS, COMPLETE, CLOSED)')
    .option('--close-reason <reason>', 'Reason for closing (DUPLICATE, NOT_PLANNED, COULD_NOT_REPRODUCE, NOT_ACTIONABLE, NO_LONGER_RELEVANT, SPAM, OTHER)')
    .option('--close-note <note>', 'Internal closure note; required when the reason is OTHER')
    .option('--category <category>', 'Set category (BUG, FEATURE_REQUEST, IMPROVEMENT, QUESTION)')
    .option('--sentiment <sentiment>', 'Set sentiment (POSITIVE, NEGATIVE, NEUTRAL)')
    .action(async (id, opts) => {
      const writer = getWriter();

      if (!opts.status && !opts.category && !opts.sentiment) {
        throw errUsage('At least one of --status, --category, or --sentiment is required', 'Example: feedbackbasket feedback update <id> --status PLANNED');
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

      const client = requireClient();
      const data: Record<string, string> = {};
      if (opts.status) data['status'] = opts.status;
      if (opts.category) data['category'] = opts.category;
      if (opts.sentiment) data['sentiment'] = opts.sentiment;
      if (opts.closeReason) data['closeReason'] = opts.closeReason;
      if (opts.closeNote) data['closeNote'] = opts.closeNote;

      const updated = await client.updateFeedback(id, data);

      if (!writer.isMachineOutput()) {
        console.log(brand.success(`Updated feedback ${id}`));
        if (opts.status) console.log(`  Status:    ${opts.status}`);
        if (opts.category) console.log(`  Category:  ${opts.category}`);
        if (opts.sentiment) console.log(`  Sentiment: ${opts.sentiment}`);
        if (opts.closeReason) console.log(`  Reason:    ${opts.closeReason}`);
      }

      writer.ok(updated, {
        summary: `Updated feedback ${id}`,
        breadcrumbs: [
          {
            action: 'View updated item',
            cmd: `feedbackbasket feedback show ${id}`,
          },
          {
            action: 'Add a note',
            cmd: `feedbackbasket feedback note ${id} "<note>"`,
          },
          { action: 'Back to list', cmd: 'feedbackbasket feedback list' },
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
