import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth } from '../output/errors.js';
import { brand, divider } from '../output/theme.js';
import type { OutputWriter } from '../output/writer.js';
import type { BugReport, FeedbackStatus, Severity } from '../types.js';

function resolveProjectId(optProject?: string): string | undefined {
  if (optProject) return optProject;
  const config = loadConfig();
  return config.defaultProject;
}

export function createBugsCommand(getWriter: () => OutputWriter): Command {
  const bugs = new Command('bugs')
    .description('View bug reports');

  bugs
    .command('list')
    .description('List bug reports with severity classification')
    .option('--project <id>', 'Filter by project ID')
    .option('--severity <level>', 'Filter by severity (high, medium, low)')
    .option('--status <status>', 'Filter by status')
    .option('--search <query>', 'Search bug content')
    .option('--limit <n>', 'Max results (1-100)', '20')
    .option('--offset <n>', 'Offset for pagination', '0')
    .option('--notes', 'Include internal notes')
    .action(async (opts) => {
      const writer = getWriter();
      const client = requireClient();

      const result = await client.getBugReports({
        projectId: resolveProjectId(opts.project),
        status: opts.status as FeedbackStatus | undefined,
        severity: opts.severity as Severity | undefined,
        search: opts.search,
        limit: parseInt(opts.limit, 10),
        offset: parseInt(opts.offset, 10),
        includeNotes: opts.notes ?? false,
      });

      if (!writer.isMachineOutput()) {
        renderBugStats(result.stats);
        console.log();
        renderBugList(result.bugReports);
      }

      const breadcrumbs = [];
      if (!opts.severity) {
        breadcrumbs.push({ action: 'High severity only', cmd: `feedbackbasket bugs list --severity high${opts.project ? ` --project ${opts.project}` : ''}` });
      }
      if (result.pagination.hasMore) {
        const nextOffset = parseInt(opts.offset, 10) + parseInt(opts.limit, 10);
        breadcrumbs.push({ action: 'Next page', cmd: `feedbackbasket bugs list --offset ${nextOffset}${opts.project ? ` --project ${opts.project}` : ''}` });
      }
      breadcrumbs.push({ action: 'All feedback', cmd: 'feedbackbasket feedback list' });

      writer.ok(result.bugReports, {
        summary: `${result.stats.total} bug${result.stats.total === 1 ? '' : 's'} (${result.stats.bySeverity.high} high, ${result.stats.bySeverity.medium} medium, ${result.stats.bySeverity.low} low)`,
        notice: result.pagination.hasMore ? `Showing ${result.bugReports.length} of ${result.pagination.totalCount}` : undefined,
        breadcrumbs,
      });
    });

  bugs
    .command('stats')
    .description('Show bug statistics summary')
    .option('--project <id>', 'Filter by project ID')
    .action(async (opts) => {
      const writer = getWriter();
      const client = requireClient();

      const stats = await client.getBugStats({ projectId: opts.project });

      if (!writer.isMachineOutput()) {
        renderBugStats(stats);
      }

      writer.ok(stats, {
        summary: `${stats.total} total bugs`,
        breadcrumbs: [
          { action: 'List all bugs', cmd: 'feedbackbasket bugs list' },
          { action: 'High severity', cmd: 'feedbackbasket bugs list --severity high' },
        ],
      });
    });

  return bugs;
}

function requireClient(): FeedbackBasketClient {
  const manager = new AuthManager();
  const token = manager.resolveToken();
  if (!token) throw errAuth();
  const config = loadConfig();
  return new FeedbackBasketClient(token, config.baseUrl);
}

function renderBugStats(stats: { total: number; bySeverity: { high: number; medium: number; low: number }; byStatus: Record<string, number> }): void {
  console.log(brand.bold('Bug Summary'));
  console.log(divider(30));
  console.log(`  Total:   ${brand.bold(String(stats.total))}`);
  console.log(`  ${brand.high('High')}:    ${stats.bySeverity.high}`);
  console.log(`  ${brand.medium('Medium')}:  ${stats.bySeverity.medium}`);
  console.log(`  ${brand.low('Low')}:     ${stats.bySeverity.low}`);

  const statusEntries = Object.entries(stats.byStatus);
  if (statusEntries.length > 0) {
    console.log();
    console.log(brand.bold('By Status'));
    for (const [status, count] of statusEntries) {
      console.log(`  ${status.padEnd(14)} ${count}`);
    }
  }
}

function renderBugList(bugs: BugReport[]): void {
  if (bugs.length === 0) {
    console.log(brand.muted('  No bug reports found'));
    return;
  }

  const severityColor = { high: brand.high, medium: brand.medium, low: brand.low };

  for (const bug of bugs) {
    const sev = severityColor[bug.severity](`[${bug.severity.toUpperCase()}]`);
    const status = brand.muted(`[${bug.status}]`);
    const content = bug.content.length > 75 ? bug.content.slice(0, 72) + '...' : bug.content;

    console.log(`${sev} ${status} ${brand.muted(bug.id)}`);
    console.log(`  ${content}`);
    if (bug.aiSummary) {
      console.log(`  ${brand.hint(bug.aiSummary)}`);
    }
    console.log();
  }
}
