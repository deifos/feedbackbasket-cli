import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { Format, type OutputWriter } from '../output/writer.js';
import { brand, divider } from '../output/theme.js';
import { resolveProject } from '../resolve.js';
import type { WaitlistEntry } from '../types.js';

export function createWaitlistCommand(getWriter: () => OutputWriter): Command {
  const waitlist = new Command('waitlist')
    .description('View and export waitlist signups');

  waitlist
    .command('list [project]')
    .description('List waitlist signups with optional search')
    .option('--search <query>', 'Search email addresses and names')
    .option('--limit <n>', 'Max results (1-100)', '50')
    .option('--offset <n>', 'Offset for pagination', '0')
    .action(async (projectArg, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, projectArg);
      const limit = parseInteger(opts.limit, '--limit', 1, 100);
      const offset = parseInteger(opts.offset, '--offset', 0);
      const result = await client.getWaitlist(projectId, {
        search: opts.search,
        limit,
        offset,
      });

      if (writer.effectiveFormat() === Format.Styled) {
        renderWaitlist(result.project.name, result.project.captureMode, result.entries, result.totalSignups, result.pagination.totalCount);
        if (result.pagination.hasMore) {
          console.log(brand.muted(`  Next page: feedbackbasket waitlist list ${projectId} --offset ${offset + limit} --limit ${limit}`));
          console.log();
        }
        return;
      }

      writer.ok(result, {
        summary: `Showing ${result.entries.length} of ${result.pagination.totalCount} matching waitlist signups`,
      });
    });

  waitlist
    .command('export [project]')
    .description('Export all waitlist signups as CSV')
    .action(async (projectArg) => {
      const client = requireClient();
      const projectId = await resolveProjectId(client, projectArg);
      console.log(await client.exportWaitlist(projectId));
    });

  return waitlist;
}

function requireClient(): FeedbackBasketClient {
  const manager = new AuthManager();
  const token = manager.resolveToken();
  if (!token) throw errAuth();
  const config = loadConfig();
  return new FeedbackBasketClient(token, config.baseUrl);
}

async function resolveProjectId(
  client: FeedbackBasketClient,
  projectArg?: string,
): Promise<string> {
  if (projectArg) return (await resolveProject(client, projectArg)).id;
  const config = loadConfig();
  if (config.defaultProject) return config.defaultProject;
  throw errUsage(
    'Project is required. Pass a project name/ID or set a default.',
    'feedbackbasket waitlist list <project>',
  );
}

function parseInteger(
  value: string,
  flag: string,
  minimum: number,
  maximum?: number,
) {
  const parsed = Number(value);
  if (
    !Number.isInteger(parsed) ||
    parsed < minimum ||
    (maximum !== undefined && parsed > maximum)
  ) {
    const range = maximum === undefined ? `${minimum} or greater` : `${minimum}-${maximum}`;
    throw errUsage(`${flag} must be an integer in the range ${range}`);
  }
  return parsed;
}

function renderWaitlist(
  projectName: string,
  captureMode: 'feedback' | 'waitlist',
  entries: WaitlistEntry[],
  totalSignups: number,
  matchingSignups: number,
) {
  console.log(brand.bold(`Waitlist — ${projectName}`));
  console.log(divider(50));
  console.log();
  console.log(`  ${brand.label('Capture mode')}  ${captureMode}`);
  console.log(`  ${brand.label('Total signups')} ${totalSignups}`);
  if (matchingSignups !== totalSignups) {
    console.log(`  ${brand.label('Matches')}       ${matchingSignups}`);
  }
  console.log();

  if (entries.length === 0) {
    console.log(`  ${brand.muted('No waitlist signups found')}`);
    console.log();
    return;
  }

  for (const entry of entries) {
    console.log(`  ${brand.bold(entry.email)}${entry.name ? ` — ${entry.name}` : ''}`);
    console.log(`    ${brand.muted(new Date(entry.updatedAt).toLocaleString())}`);
    if (entry.pageUrl) console.log(`    ${brand.muted(entry.pageUrl)}`);
    console.log();
  }
}
