import { Command } from 'commander';
import { PRODUCT_OPERATIONS, type ProductOperation } from 'feedbackbasket-agent-contract';
import { requireClient, resolveProjectId } from './context.js';
import { requireHighImpactConfirmation } from '../confirmation.js';
import { errUsage } from '../output/errors.js';
import type { OutputWriter } from '../output/writer.js';

function commandFor(operation: ProductOperation, getWriter: () => OutputWriter): Command {
  const command = new Command(operation.cli.commands[0].split(' ').at(-1)).description(operation.summary);
  const fields = operation.mcp.inputSchema.properties as Record<string, Record<string, unknown>>;
  const idField = 'cardId' in fields ? 'cardId' : 'feedbackId' in fields ? 'feedbackId' : undefined;
  if (idField) command.argument('<id>', idField);
  if ('projectId' in fields) command.option('--project <id-or-name>', 'Project ID or name');
  for (const [name, field] of Object.entries(fields)) {
    if (['projectId', 'cardId', 'feedbackId', 'confirm'].includes(name)) continue;
    const flag = name.replace(/[A-Z]/g, value => `-${value.toLowerCase()}`);
    const choices = (field.enum ?? (field.items as { enum?: string[] } | undefined)?.enum) as string[] | undefined;
    command.option(`--${flag} <value>`, `${name}${choices ? ` (${choices.join(', ')})` : ''}${field.type === 'array' ? ' (comma-separated)' : ''}${Array.isArray(field.type) && field.type.includes('null') ? ' (use null to clear)' : ''}`);
  }
  if (operation.risk.explicitConfirmation) command.option('--yes', 'Confirm this change after reviewing its public effect');
  command.action(async (...values: unknown[]) => {
    const opts = (idField ? values[1] : values[0]) as Record<string, string | boolean | undefined>;
    const writer = getWriter(); const client = requireClient(); const args: Record<string, unknown> = {};
    if (idField) args[idField] = values[0];
    if ('projectId' in fields) args.projectId = await resolveProjectId(client, opts.project as string | undefined);
    for (const [name, field] of Object.entries(fields)) {
      if (['projectId', 'cardId', 'feedbackId', 'confirm'].includes(name) || opts[name] === undefined) continue;
      const value = String(opts[name]);
      if (field.type === 'boolean') {
        if (!['true', 'false'].includes(value)) throw errUsage(`--${name} must be true or false`);
        args[name] = value === 'true';
      } else if (field.type === 'integer') {
        const number = Number(value);
        if (!Number.isSafeInteger(number) || number < Number(field.minimum ?? 0) || number > Number(field.maximum ?? Number.MAX_SAFE_INTEGER)) throw errUsage(`Invalid ${name}`);
        args[name] = number;
      } else if (field.type === 'array') args[name] = value === '' ? [] : value.split(',').map(item => item.trim());
      else args[name] = value === 'null' && Array.isArray(field.type) && field.type.includes('null') ? null : value;
    }
    if (operation.risk.explicitConfirmation) {
      await requireHighImpactConfirmation(writer, opts.yes === true, operation.summary + '?', 'Review this change before confirming.');
      args.confirm = true;
    }
    const result = await client.executeOperation(operation.id, args);
    writer.ok(result, { summary: operation.summary });
  });
  return command;
}
export function createCommunityCommand(group: 'boards' | 'roadmap' | 'telegram' | 'conversations', getWriter: () => OutputWriter): Command {
  const command = new Command(group).description(group === 'conversations' ? 'Manage reply permissions and save drafts' : group === 'telegram' ? 'Connect Telegram and configure feedback notifications' : group === 'boards' ? 'Manage public boards and inspect votes' : 'Manage roadmap settings and cards');
  for (const operation of PRODUCT_OPERATIONS.filter(op => op.cli.commands.some(value => value.startsWith(group + ' ')))) command.addCommand(commandFor(operation, getWriter));
  return command;
}
export function createFeedbackVotesCommand(getWriter: () => OutputWriter): Command {
  return commandFor(PRODUCT_OPERATIONS.find(op => op.id === 'feedback.listVotes')!, getWriter);
}
