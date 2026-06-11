import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand } from '../output/theme.js';
import { ask } from '../prompt.js';
import type { OutputWriter } from '../output/writer.js';
import type { ReplyDelivery } from '../types.js';

const deliveryOptions = new Set(['email', 'widget', 'both']);

export function createFeedbackReplyCommand(getWriter: () => OutputWriter): Command {
  return new Command('reply')
    .argument('<id>', 'Feedback ID to reply to')
    .argument('[content]', 'Reply content (or use --content)')
    .description('Reply to feedback by email, widget thread, or both')
    .option('--content <text>', 'Reply content (alternative to positional argument)')
    .option('--delivery <delivery>', 'Reply delivery (email, widget, both)', 'email')
    .option('--reply-to <email>', 'Reply-to email for email delivery')
    .action(async (id, contentArg, opts) => {
      const writer = getWriter();
      const content = contentArg ?? opts.content;
      const delivery = opts.delivery as ReplyDelivery;

      if (!content) {
        throw errUsage(
          'Reply content is required',
          'Example: feedbackbasket feedback reply <id> "Thanks for reporting this!" --delivery widget',
        );
      }
      if (!deliveryOptions.has(delivery)) {
        throw errUsage(
          'Delivery must be email, widget, or both',
          'Example: feedbackbasket feedback reply <id> "Thanks!" --delivery both --reply-to support@example.com',
        );
      }

      const client = requireClient();
      const feedback = await client.getFeedbackById(id);
      const destinations = delivery === 'both'
        ? ['email', 'widget'] as Array<'email' | 'widget'>
        : [delivery] as Array<'email' | 'widget'>;
      const sendsEmail = destinations.includes('email');
      const sendsWidget = destinations.includes('widget');
      let replyTo: string | undefined = opts.replyTo ?? feedback.project.replyToEmail ?? undefined;

      if (sendsEmail) {
        if (!feedback.email) {
          throw errUsage(
            'This feedback has no email address; use --delivery widget if it has a widget thread.',
          );
        }

        if (!replyTo) {
          const isInteractive = !writer.isMachineOutput() && process.stdin.isTTY;

          if (!isInteractive) {
            throw errUsage(
              'No reply-to email configured for this project.',
              'Ask the human which reply-to email to use, then pass --reply-to <email> or set a project default.',
            );
          }

          console.log();
          console.log(brand.warning('  No reply-to email configured for this project.'));
          console.log(brand.muted('  The recipient will see this as the sender address.'));
          console.log();

          replyTo = await ask('  Enter reply-to email: ');
          if (!replyTo || !replyTo.includes('@')) {
            console.log(brand.muted('  Cancelled.'));
            return;
          }

          console.log();
          console.log(brand.muted(`  Tip: Set a default with: feedbackbasket projects update ${feedback.project.name} --reply-to ${replyTo}`));
          console.log();
        }
      }

      if (sendsWidget && !feedback.hasWidgetAccess) {
        throw errUsage(
          'This feedback is not connected to a widget thread.',
          'Use --delivery email for feedback with an email address, or ask the human how they want to respond.',
        );
      }

      const result = await client.sendReply(id, content, {
        replyToEmail: replyTo,
        destinations,
      });

      if (!writer.isMachineOutput()) {
        if (result.sentTo) {
          console.log(`  ${brand.success('[OK]')} Email reply sent to ${brand.bold(result.sentTo)}`);
          if (result.reply) {
            console.log(`    ${brand.muted('From:')} ${result.reply.replyToEmail}`);
            console.log(`    ${brand.muted('By:')}   ${result.reply.sentBy}`);
          }
        }
        if (result.message) {
          console.log(`  ${brand.success('[OK]')} Widget reply posted`);
          console.log(`    ${brand.muted('By:')}   ${result.message.sentByName ?? 'CLI'}`);
        }
        console.log();
      }

      writer.ok(result, {
        summary: delivery === 'both'
          ? 'Reply sent by email and widget'
          : delivery === 'widget'
            ? 'Widget reply posted'
            : `Reply sent to ${result.sentTo}`,
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
      const messages = result.messages ?? [];
      const visibleWidgetMessages = messages.filter((item) => !item.replyId);

      if (!writer.isMachineOutput()) {
        if (result.total === 0) {
          console.log(brand.muted('  No replies sent yet.'));
          console.log();
        } else {
          console.log(brand.bold(`${result.total} repl${result.total === 1 ? 'y' : 'ies'} for feedback ${id}`));
          console.log();
          for (const r of result.replies) {
            console.log(`  ${brand.success('->')} ${brand.bold(r.sentBy)} ${brand.muted(r.createdAt)}`);
            console.log(`    ${brand.muted('Delivery:')} email`);
            console.log(`    ${brand.muted('Reply-to:')} ${r.replyToEmail}`);
            console.log();
            for (const line of r.content.split('\n')) {
              console.log(`    ${line}`);
            }
            console.log();
          }
          for (const message of visibleWidgetMessages) {
            console.log(`  ${brand.success('->')} ${brand.bold(message.sentByName ?? 'CLI')} ${brand.muted(message.createdAt)}`);
            console.log(`    ${brand.muted('Delivery:')} widget`);
            console.log();
            for (const line of message.content.split('\n')) {
              console.log(`    ${line}`);
            }
            console.log();
          }
        }
      }

      writer.ok({ replies: result.replies, messages }, {
        summary: `${result.total} repl${result.total === 1 ? 'y' : 'ies'}`,
        breadcrumbs: [
          { action: 'Send an email reply', cmd: `feedbackbasket feedback reply ${id} "<content>" --delivery email` },
          { action: 'Post a widget reply', cmd: `feedbackbasket feedback reply ${id} "<content>" --delivery widget` },
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
