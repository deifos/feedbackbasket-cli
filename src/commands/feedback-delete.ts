import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth } from '../output/errors.js';
import { brand } from '../output/theme.js';
import { confirm } from '../prompt.js';
import type { OutputWriter } from '../output/writer.js';

export function createFeedbackDeleteCommand(getWriter: () => OutputWriter): Command {
  return new Command('delete')
    .argument('<id>', 'Feedback ID to delete')
    .description('Delete a feedback item')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (id, opts) => {
      const writer = getWriter();
      const client = requireClient();

      if (!opts.yes && !writer.isMachineOutput() && process.stdin.isTTY) {
        console.log(`  ${brand.warning('Warning:')} This will permanently delete feedback ${brand.bold(id)}`);
        console.log();
        const confirmed = await confirm('  Delete this feedback?', false);
        if (!confirmed) {
          console.log(brand.muted('  Cancelled.'));
          return;
        }
      }

      const result = await client.deleteFeedback(id);

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Deleted feedback ${id}`);
        console.log();
      }

      writer.ok(result, {
        summary: `Deleted feedback ${id}`,
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
