import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand, divider } from '../output/theme.js';
import { confirm } from '../prompt.js';
import type { OutputWriter } from '../output/writer.js';

export function createTeamCommand(getWriter: () => OutputWriter): Command {
  const team = new Command('team')
    .description('Manage organization members');

  // --- team list ---
  team
    .command('list')
    .description('List organization members')
    .action(async () => {
      const writer = getWriter();
      const client = requireClient();

      const result = await client.listTeam();

      if (!writer.isMachineOutput()) {
        renderTeamTable(result.members);
      }

      writer.ok(result.members, {
        summary: `${result.totalMembers} member${result.totalMembers === 1 ? '' : 's'}`,
        breadcrumbs: [
          { action: 'Update role', cmd: 'feedbackbasket team role <memberId> --role admin' },
        ],
      });
    });

  // --- team role ---
  team
    .command('role <memberId>')
    .description('Update a member\'s role')
    .requiredOption('--role <role>', 'New role: admin or member')
    .action(async (memberId, opts) => {
      const writer = getWriter();
      const client = requireClient();

      if (!['admin', 'member'].includes(opts.role)) {
        throw errUsage('Role must be "admin" or "member"');
      }

      const result = await client.updateMemberRole(memberId, opts.role);

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Updated ${brand.bold(result.name)} to ${brand.bold(result.role)}`);
        console.log();
      }

      writer.ok(result, {
        summary: `Updated ${result.name} to ${result.role}`,
        breadcrumbs: [
          { action: 'List team', cmd: 'feedbackbasket team list' },
        ],
      });
    });

  // --- team remove ---
  team
    .command('remove <memberId>')
    .description('Remove a member from the organization')
    .option('--yes', 'Skip confirmation')
    .action(async (memberId, opts) => {
      const writer = getWriter();
      const client = requireClient();

      if (!opts.yes && !writer.isMachineOutput() && process.stdin.isTTY) {
        const confirmed = await confirm(`  Remove member ${memberId}?`, false);
        if (!confirmed) {
          console.log(brand.muted('  Cancelled.'));
          return;
        }
      }

      const result = await client.removeMember(memberId);

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Removed ${brand.bold(result.name)} (${result.email})`);
        console.log();
      }

      writer.ok(result, {
        summary: `Removed ${result.name}`,
        breadcrumbs: [
          { action: 'List team', cmd: 'feedbackbasket team list' },
        ],
      });
    });

  return team;
}

function requireClient(): FeedbackBasketClient {
  const manager = new AuthManager();
  const token = manager.resolveToken();
  if (!token) throw errAuth();
  const config = loadConfig();
  return new FeedbackBasketClient(token, config.baseUrl);
}

function renderTeamTable(members: Array<{ memberId: string; name: string; email: string; role: string; joinedAt: string }>): void {
  if (members.length === 0) return;

  const nameW = Math.max(4, ...members.map(m => m.name.length));
  const emailW = Math.max(5, ...members.map(m => m.email.length));

  const header = [
    brand.bold('Name'.padEnd(nameW)),
    brand.bold('Email'.padEnd(emailW)),
    brand.bold('Role'.padEnd(8)),
    brand.bold('Member ID'),
  ].join('  ');

  console.log(header);
  console.log(divider(header.length));

  for (const m of members) {
    const roleColor = m.role === 'owner' ? brand.primary : m.role === 'admin' ? brand.warning : brand.muted;
    const row = [
      m.name.padEnd(nameW),
      brand.muted(m.email.padEnd(emailW)),
      roleColor(m.role.padEnd(8)),
      brand.muted(m.memberId),
    ].join('  ');
    console.log(row);
  }
}
