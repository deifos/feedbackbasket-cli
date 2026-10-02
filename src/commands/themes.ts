import { Command } from 'commander';
import { brand, divider } from '../output/theme.js';
import type { OutputWriter } from '../output/writer.js';
import type { Theme } from '../types.js';
import { parseIntOption, requireClient, resolveProjectId } from './context.js';

export function createThemesCommand(getWriter: () => OutputWriter): Command {
  const themes = new Command('themes')
    .description('See what several people reported (grouped feedback)');

  themes
    .command('list')
    .description('List feedback themes, largest first')
    .option('--project <id-or-name>', 'Project ID or name')
    .option('--min-reports <n>', 'Only themes with at least this many reports (default 2)')
    .option('--limit <n>', 'Maximum themes to return (1-100)')
    .action(async (opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, opts.project);
      const result = await client.listThemes(projectId, {
        minReports: parseIntOption(opts.minReports, '--min-reports', 1, 1000),
        limit: parseIntOption(opts.limit, '--limit', 1, 100),
      });

      if (!writer.isMachineOutput()) renderThemes(result.themes);

      writer.ok(result.themes, {
        summary: `${result.themes.length} theme${result.themes.length === 1 ? '' : 's'}`,
        breadcrumbs: result.themes[0]
          ? [
              { action: 'Show a theme', cmd: `feedbackbasket themes show ${result.themes[0].id} --project ${projectId}` },
              { action: 'Draft a GitHub issue', cmd: `feedbackbasket github draft --theme ${result.themes[0].id} --project ${projectId}` },
            ]
          : [],
      });
    });

  themes
    .command('show <themeId>')
    .description('Show a theme with its reports')
    .option('--project <id-or-name>', 'Project ID or name')
    .action(async (themeId, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, opts.project);
      const theme = await client.getTheme(projectId, themeId);

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.bold(theme.title ?? 'Untitled theme')}  ${brand.muted(`${theme.reportCount} reports`)}`);
        if (theme.summary) console.log(`  ${theme.summary}`);
        if (theme.githubIssue) {
          console.log(`  ${brand.muted('GitHub:')} #${theme.githubIssue.number} (${theme.githubIssue.state}) ${theme.githubIssue.url}`);
        }
        console.log();
        for (const item of theme.feedback) {
          const text = item.content.replace(/\s+/g, ' ');
          console.log(`  ${brand.muted(item.id)}  ${text.length > 90 ? `${text.slice(0, 89)}…` : text}`);
        }
        console.log();
      }

      writer.ok(theme, {
        summary: `${theme.title ?? 'Untitled theme'}: ${theme.reportCount} reports`,
        breadcrumbs: [
          { action: 'Draft a GitHub issue', cmd: `feedbackbasket github draft --theme ${theme.id} --project ${projectId}` },
        ],
      });
    });

  return themes;
}

function renderThemes(themes: Theme[]): void {
  if (themes.length === 0) {
    console.log('  No themes yet. A theme appears when two or more people report something similar.');
    return;
  }
  const header = [brand.bold('Reports'.padEnd(7)), brand.bold('GitHub'.padEnd(12)), brand.bold('Theme')].join('  ');
  console.log(header);
  console.log(divider(header.length));
  for (const theme of themes) {
    const issue = theme.githubIssue ? `#${theme.githubIssue.number} ${theme.githubIssue.state}` : '-';
    console.log(
      [String(theme.reportCount).padEnd(7), brand.muted(issue.padEnd(12)), `${theme.title ?? 'Untitled theme'} ${brand.muted(theme.id)}`].join('  '),
    );
  }
}
