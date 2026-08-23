import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand } from '../output/theme.js';
import { requireHighImpactConfirmation } from '../confirmation.js';
import type { OutputWriter } from '../output/writer.js';

export function createFeedbackNoteCommand(getWriter: () => OutputWriter): Command {
  const note = new Command('note')
    .argument('[id]', 'Feedback ID to add a note to')
    .argument('[content]', 'Note content (or use --content)')
    .description('Add an internal note to a feedback item')
    .option('--content <text>', 'Note content (alternative to positional argument)')
    .action(async (id, contentArg, opts) => {
      const writer = getWriter();
      const content = contentArg ?? opts.content;

      if (!id) {
        throw errUsage(
          'Feedback ID is required',
          'Example: feedbackbasket feedback note <id> "Your note here"',
        );
      }
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

  note
    .command('update <feedbackId> <noteId>')
    .description('Update an internal feedback note')
    .requiredOption('--content <text>', 'New note content')
    .action(async (feedbackId, noteId, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const result = await client.updateNote(feedbackId, noteId, opts.content);
      writer.ok(result, {
        summary: `Updated note ${noteId}`,
        breadcrumbs: [{ action: 'View feedback', cmd: `feedbackbasket feedback show ${feedbackId}` }],
      });
    });

  note
    .command('delete <feedbackId> <noteId>')
    .description('Delete an internal feedback note')
    .option('--yes', 'Confirm note deletion')
    .action(async (feedbackId, noteId, opts) => {
      const writer = getWriter();
      const client = requireClient();
      await requireHighImpactConfirmation(
        writer,
        Boolean(opts.yes),
        `Delete note ${noteId}?`,
        '--yes is required to delete a note in machine mode.',
      );
      const result = await client.deleteNote(feedbackId, noteId);
      writer.ok(result, {
        summary: `Deleted note ${noteId}`,
        breadcrumbs: [{ action: 'View feedback', cmd: `feedbackbasket feedback show ${feedbackId}` }],
      });
    });

  return note;
}

function requireClient(): FeedbackBasketClient {
  const manager = new AuthManager();
  const token = manager.resolveToken();
  if (!token) throw errAuth();
  const config = loadConfig();
  return new FeedbackBasketClient(token, config.baseUrl);
}
