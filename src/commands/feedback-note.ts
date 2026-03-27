import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand } from '../output/theme.js';
import type { OutputWriter } from '../output/writer.js';

export function createFeedbackNoteCommand(getWriter: () => OutputWriter): Command {
  return new Command('note')
    .argument('<id>', 'Feedback ID to add a note to')
    .argument('[content]', 'Note content (or use --content)')
    .description('Add an internal note to a feedback item')
    .option('--content <text>', 'Note content (alternative to positional argument)')
    .action(async (id, contentArg, opts) => {
      const writer = getWriter();
      const content = contentArg ?? opts.content;

      if (!content) {
        throw errUsage(
          'Note content is required',
          'Example: feedbackbasket feedback note <id> "Your note here"',
        );
      }

      const client = requireClient();
      const note = await client.createNote(id, content);

      if (!writer.isMachineOutput()) {
        console.log(brand.success(`Note added to feedback ${id}`));
        console.log(`  ${content}`);
      }

      writer.ok(note, {
        summary: `Note added to feedback ${id}`,
        breadcrumbs: [
          { action: 'View feedback', cmd: `feedbackbasket feedback show ${id}` },
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
