import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand } from '../output/theme.js';
import { ask } from '../prompt.js';
import type { OutputWriter } from '../output/writer.js';
import type { ReplyDelivery } from '../types.js';

const deliveryOptions = new Set(['email', 'widget', 'in-app', 'both']);

export function createFeedbackReplyCommand(getWriter: () => OutputWriter): Command {
  return new Command('reply')
    .argument('<id>', 'Feedback ID to reply to')
    .argument('[content]', 'Reply content (or use --content)')
    .description('Reply to feedback by email, widget/in-app thread, or both')
    .option('--content <text>', 'Reply content (alternative to positional argument)')
    .option('--delivery <delivery>', 'Reply delivery (email, widget, in-app, both)', 'email')
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
          'Delivery must be email, widget, in-app, or both',
          'Example: feedbackbasket feedback reply <id> "Thanks!" --delivery both --reply-to support@example.com',
        );
      }

      const client = requireClient();
      const feedback = await client.getFeedbackById(id);
      if (delivery === 'in-app' && feedback.replyChannel !== 'in_app') {
        throw errUsage(
          'This feedback does not have an in-app reply thread.',
          'Use --delivery widget for website-widget feedback or --delivery email when an email address is available.',
        );
      }
      const destinations = replyDestinations(delivery);
      const sendsEmail = destinations.includes('email');
      const sendsWidget = destinations.includes('widget');
      let replyTo: string | undefined = opts.replyTo ?? feedback.project.replyToEmail ?? undefined;

      if (sendsEmail) {
        if (!feedback.email) {
          throw errUsage(
            feedback.replyChannel === 'in_app'
              ? 'This feedback has no email address; use --delivery in-app.'
              : 'This feedback has no email address; use --delivery widget if it has a widget thread.',
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
          'This feedback has no in-app or widget reply thread.',
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
          console.log(`  ${brand.success('[OK]')} ${feedback.replyChannel === 'in_app' ? 'In-app' : 'Widget'} reply posted`);
          console.log(`    ${brand.muted('By:')}   ${result.message.sentByName ?? 'CLI'}`);
        }
        console.log();
      }

      writer.ok(result, {
        summary: delivery === 'both'
          ? `Reply sent by email and ${feedback.replyChannel === 'in_app' ? 'in-app' : 'widget'}`
          : sendsWidget
            ? `${feedback.replyChannel === 'in_app' ? 'In-app' : 'Widget'} reply posted`
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
    .description('List the complete feedback conversation')
    .action(async (id) => {
      const writer = getWriter();
      const client = requireClient();

      const result = await client.listReplies(id);
      const messages = result.messages ?? [];
      const linkedReplyIds = new Set(messages.map((item) => item.replyId).filter((replyId): replyId is string => replyId !== null));
      const visibleEmailReplies = result.replies.filter((item) => !linkedReplyIds.has(item.id));
      const conversation = [
        ...visibleEmailReplies.map((item) => ({ kind: 'email' as const, item })),
        ...messages.map((item) => ({ kind: 'thread' as const, item })),
      ].sort((left, right) => new Date(left.item.createdAt).getTime() - new Date(right.item.createdAt).getTime());

      if (!writer.isMachineOutput()) {
        if (result.total === 0) {
          console.log(brand.muted('  No replies sent yet.'));
          console.log();
        } else {
          console.log(brand.bold(`${result.total} conversation message${result.total === 1 ? '' : 's'} for feedback ${id}`));
          console.log();
          for (const entry of conversation) {
            if (entry.kind === 'email') {
              const emailReply = entry.item;
              console.log(`  ${brand.success('->')} ${brand.bold(emailReply.sentBy)} ${brand.muted(emailReply.createdAt)}`);
              console.log(`    ${brand.muted('Delivery:')} email`);
              console.log(`    ${brand.muted('Reply-to:')} ${emailReply.replyToEmail}`);
              console.log();
              for (const line of emailReply.content.split('\n')) {
                console.log(`    ${line}`);
              }
            } else {
              const message = entry.item;
              const visitor = message.senderType === 'VISITOR';
              console.log(`  ${visitor ? brand.primary('<-') : brand.success('->')} ${brand.bold(visitor ? 'User' : (message.sentByName ?? 'CLI'))} ${brand.muted(message.createdAt)}`);
              console.log(`    ${brand.muted('Delivery:')} ${visitor ? 'visitor follow-up' : message.delivery === 'BOTH' ? 'email + widget/in-app' : 'widget/in-app'}`);
              console.log();
              for (const line of message.content.split('\n')) {
                console.log(`    ${line}`);
              }
            }
            console.log();
          }
        }
      }

      writer.ok({ replies: result.replies, messages }, {
        summary: `${result.total} conversation message${result.total === 1 ? '' : 's'}`,
        breadcrumbs: [
          { action: 'Send an email reply', cmd: `feedbackbasket feedback reply ${id} "<content>" --delivery email` },
          { action: 'Post a widget reply', cmd: `feedbackbasket feedback reply ${id} "<content>" --delivery widget` },
          { action: 'View feedback', cmd: `feedbackbasket feedback show ${id}` },
        ],
      });
    });
}

export function replyDestinations(
  delivery: ReplyDelivery,
): Array<'email' | 'widget'> {
  if (delivery === 'both') return ['email', 'widget'];
  if (delivery === 'in-app') return ['widget'];
  return [delivery];
}

function requireClient(): FeedbackBasketClient {
  const manager = new AuthManager();
  const token = manager.resolveToken();
  if (!token) throw errAuth();
  const config = loadConfig();
  return new FeedbackBasketClient(token, config.baseUrl);
}
