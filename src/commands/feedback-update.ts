import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand } from '../output/theme.js';
import type { OutputWriter } from '../output/writer.js';

export function createFeedbackUpdateCommand(getWriter: () => OutputWriter): Command {
  return new Command('update')
    .argument('<id>', 'Feedback ID to update')
    .description('Update a feedback item')
    .option('--status <status>', 'Set status (OPEN, UNDER_REVIEW, PLANNED, IN_PROGRESS, COMPLETE, CLOSED)')
    .option('--category <category>', 'Set category (BUG, FEATURE_REQUEST, IMPROVEMENT, QUESTION)')
    .option('--sentiment <sentiment>', 'Set sentiment (POSITIVE, NEGATIVE, NEUTRAL)')
    .action(async (id, opts) => {
      const writer = getWriter();

      if (!opts.status && !opts.category && !opts.sentiment) {
        throw errUsage(
          'At least one of --status, --category, or --sentiment is required',
          'Example: feedbackbasket feedback update <id> --status PLANNED',
        );
      }

      const client = requireClient();
      const data: Record<string, string> = {};
      if (opts.status) data['status'] = opts.status;
      if (opts.category) data['category'] = opts.category;
      if (opts.sentiment) data['sentiment'] = opts.sentiment;

      const updated = await client.updateFeedback(id, data);

      if (!writer.isMachineOutput()) {
        console.log(brand.success(`Updated feedback ${id}`));
        if (opts.status) console.log(`  Status:    ${opts.status}`);
        if (opts.category) console.log(`  Category:  ${opts.category}`);
        if (opts.sentiment) console.log(`  Sentiment: ${opts.sentiment}`);
      }

      writer.ok(updated, {
        summary: `Updated feedback ${id}`,
        breadcrumbs: [
          { action: 'View updated item', cmd: `feedbackbasket feedback show ${id}` },
          { action: 'Add a note', cmd: `feedbackbasket feedback note ${id} "<note>"` },
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
