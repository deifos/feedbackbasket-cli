import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand } from '../output/theme.js';
import { ask, confirm } from '../prompt.js';
import type { OutputWriter } from '../output/writer.js';

export function createFeedbackReplyCommand(getWriter: () => OutputWriter): Command {
  return new Command('reply')
    .argument('<id>', 'Feedback ID to reply to')
    .argument('[content]', 'Reply content (or use --content)')
    .description('Send an email reply to the feedback submitter')
    .option('--content <text>', 'Reply content (alternative to positional argument)')
    .option('--reply-to <email>', 'Reply-to email (overrides project default)')
    .action(async (id, contentArg, opts) => {
      const writer = getWriter();
      const content = contentArg ?? opts.content;

      if (!content) {
        throw errUsage(
          'Reply content is required',
          'Example: feedbackbasket feedback reply <id> "Thanks for reporting this!"',
        );
      }

      const client = requireClient();
      let replyTo: string | undefined = opts.replyTo;

      // If no --reply-to flag, check if we need to resolve one interactively
      if (!replyTo) {
        const feedback = await client.getFeedbackById(id);

        if (!feedback.email) {
          throw errUsage(
            'This feedback has no email address — cannot send a reply.',
          );
        }

        const projectReplyTo = feedback.project.replyToEmail;

        if (!projectReplyTo) {
          const isInteractive = !writer.isMachineOutput() && process.stdin.isTTY;

          if (isInteractive) {
            // Get user's email as suggestion
            const manager = new AuthManager();
            const creds = manager.getCredentials();
            const accountEmail = creds?.email;

            console.log();
            console.log(brand.warning('  No reply-to email configured for this project.'));
            console.log(brand.muted('  The recipient will see this as the sender address.'));
            console.log();

            if (accountEmail) {
              const useAccount = await confirm(`  Use ${brand.bold(accountEmail)}?`);
              if (useAccount) {
                replyTo = accountEmail;
              } else {
                replyTo = await ask('  Enter reply-to email: ');
                if (!replyTo || !replyTo.includes('@')) {
                  console.log(brand.muted('  Cancelled.'));
                  return;
                }
              }
            } else {
              replyTo = await ask('  Enter reply-to email: ');
              if (!replyTo || !replyTo.includes('@')) {
                console.log(brand.muted('  Cancelled.'));
                return;
              }
            }

            console.log();
            console.log(brand.muted(`  Tip: Set a default with: feedbackbasket projects update ${feedback.project.name} --reply-to ${replyTo}`));
            console.log();
          } else {
            // Agent mode — must pass --reply-to or set project default
            throw errUsage(
              'No reply-to email configured for this project.',
              `Pass --reply-to <email> or set a default: feedbackbasket projects update <project> --reply-to <email>`,
            );
          }
        }
      }

      const result = await client.sendReply(id, content, replyTo);

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Reply sent to ${brand.bold(result.sentTo)}`);
        console.log(`    ${brand.muted('From:')} ${result.reply.replyToEmail}`);
        console.log(`    ${brand.muted('By:')}   ${result.reply.sentBy}`);
        console.log();
      }

      writer.ok(result, {
        summary: `Reply sent to ${result.sentTo}`,
        breadcrumbs: [
          { action: 'View replies', cmd: `feedbackbasket feedback replies ${id}` },
          { action: 'Update status', cmd: `feedbackbasket feedback update ${id} --status COMPLETE` },
          { action: 'Add note', cmd: `feedbackbasket feedback note ${id} "<note>"` },
        ],
      });
    });
}

export function createFeedbackRepliesCommand(getWriter: () => OutputWriter): Command {
  return new Command('replies')
    .argument('<id>', 'Feedback ID')
    .description('List all replies sent for a feedback item')
    .action(async (id) => {
      const writer = getWriter();
      const client = requireClient();

      const result = await client.listReplies(id);

      if (!writer.isMachineOutput()) {
        if (result.replies.length === 0) {
          console.log(brand.muted('  No replies sent yet.'));
          console.log();
        } else {
          console.log(brand.bold(`${result.total} repl${result.total === 1 ? 'y' : 'ies'} for feedback ${id}`));
          console.log();
          for (const r of result.replies) {
            console.log(`  ${brand.success('→')} ${brand.bold(r.sentBy)} ${brand.muted(r.createdAt)}`);
            console.log(`    ${brand.muted('Reply-to:')} ${r.replyToEmail}`);
            console.log();
            for (const line of r.content.split('\n')) {
              console.log(`    ${line}`);
            }
            console.log();
          }
        }
      }

      writer.ok(result.replies, {
        summary: `${result.total} repl${result.total === 1 ? 'y' : 'ies'}`,
        breadcrumbs: [
          { action: 'Send a reply', cmd: `feedbackbasket feedback reply ${id} "<content>"` },
          { action: 'View feedback', cmd: `feedbackbasket feedback show ${id}` },
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
