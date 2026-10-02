import { Command } from 'commander';
import { errUsage } from '../output/errors.js';
import { brand } from '../output/theme.js';
import { requireHighImpactConfirmation } from '../confirmation.js';
import type { OutputWriter } from '../output/writer.js';
import type { GithubAutomation, GithubIssueTarget } from '../types.js';
import { parseIntOption, requireClient, resolveProjectId } from './context.js';

const MODES = ['off', 'approval', 'auto'] as const;
const CATEGORIES = ['BUG', 'FEATURE_REQUEST', 'IMPROVEMENT'] as const;

function targetFrom(opts: { theme?: string; feedback?: string }): GithubIssueTarget {
  if (Boolean(opts.theme) === Boolean(opts.feedback)) {
    throw errUsage('Provide exactly one of --theme <id> or --feedback <id>');
  }
  return opts.theme ? { themeId: opts.theme } : { feedbackId: opts.feedback };
}

export function createGithubCommand(getWriter: () => OutputWriter): Command {
  const github = new Command('github')
    .description('Turn feedback into GitHub issues');

  github
    .command('status')
    .description('Show GitHub availability, linked repository, and automation settings')
    .option('--project <id-or-name>', 'Project ID or name')
    .action(async (opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, opts.project);
      const status = await client.getGithubStatus(projectId);

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.bold('GitHub issues')}  ${status.available ? 'available' : 'not available on this plan'}`);
        console.log(`  Repository:     ${status.repository ?? brand.muted('not linked (connect in the dashboard)')}`);
        if (status.automation) {
          console.log(`  Automation:     ${status.automation.mode}${status.automation.closeLoop ? ', closes the loop' : ''}`);
        }
        console.log(`  Pending drafts: ${status.pendingDrafts}`);
        console.log();
      }

      writer.ok(status, {
        summary: status.repository ? `Linked to ${status.repository}` : 'No repository linked',
        breadcrumbs: [{ action: 'List drafts', cmd: `feedbackbasket github drafts list --project ${projectId}` }],
      });
    });

  github
    .command('draft')
    .description('Draft an issue title and body from a theme or feedback item (nothing is posted)')
    .option('--project <id-or-name>', 'Project ID or name')
    .option('--theme <id>', 'Theme to draft an issue for')
    .option('--feedback <id>', 'Feedback item to draft an issue for')
    .action(async (opts) => {
      const writer = getWriter();
      const target = targetFrom(opts);
      const client = requireClient();
      const projectId = await resolveProjectId(client, opts.project);
      const draft = await client.draftGithubIssue(projectId, target);

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.bold(draft.title)}`);
        console.log();
        console.log(draft.body.split('\n').map((line) => `  ${line}`).join('\n'));
        console.log();
      }

      writer.ok(draft, {
        summary: draft.title,
        breadcrumbs: [
          {
            action: 'Create the issue',
            cmd: `feedbackbasket github issue create ${opts.theme ? `--theme ${opts.theme}` : `--feedback ${opts.feedback}`} --title "<title>" --body "<body>" --project ${projectId} --yes`,
          },
        ],
      });
    });

  const issue = github.command('issue').description('Create GitHub issues');
  issue
    .command('create')
    .description('Create a GitHub issue from a theme or feedback item')
    .option('--project <id-or-name>', 'Project ID or name')
    .option('--theme <id>', 'Theme the issue is about')
    .option('--feedback <id>', 'Feedback item the issue is about')
    .requiredOption('--title <title>', 'Issue title')
    .requiredOption('--body <body>', 'Issue description (markdown)')
    .option('--yes', 'Confirm posting to the linked GitHub repository')
    .action(async (opts) => {
      const writer = getWriter();
      const target = targetFrom(opts);
      const client = requireClient();
      const projectId = await resolveProjectId(client, opts.project);

      await requireHighImpactConfirmation(
        writer,
        Boolean(opts.yes),
        'Create this issue in the linked GitHub repository?',
        '--yes is required to create a GitHub issue in machine mode.',
      );
      const { issue: created } = await client.createGithubIssue(projectId, { ...target, title: opts.title, body: opts.body });

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Created issue #${created.issueNumber}  ${created.issueUrl}`);
        console.log();
      }
      writer.ok(created, { summary: `Created issue #${created.issueNumber}` });
    });

  const drafts = github.command('drafts').description('Review issue drafts proposed by automation');
  drafts
    .command('list')
    .description('List pending drafts')
    .option('--project <id-or-name>', 'Project ID or name')
    .action(async (opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, opts.project);
      const { drafts: items } = await client.listGithubDrafts(projectId);

      if (!writer.isMachineOutput()) {
        if (items.length === 0) console.log('  No drafts waiting for review.');
        for (const item of items) console.log(`  ${brand.muted(item.id)}  ${item.title}`);
        if (items.length > 0) console.log();
      }
      writer.ok(items, {
        summary: `${items.length} pending draft${items.length === 1 ? '' : 's'}`,
        breadcrumbs: items[0]
          ? [{ action: 'Approve a draft', cmd: `feedbackbasket github drafts approve ${items[0].id} --project ${projectId} --yes` }]
          : [],
      });
    });

  drafts
    .command('approve <draftId>')
    .description('Create the GitHub issue for a pending draft')
    .option('--project <id-or-name>', 'Project ID or name')
    .option('--title <title>', 'Edited issue title')
    .option('--body <body>', 'Edited issue description')
    .option('--yes', 'Confirm posting to the linked GitHub repository')
    .action(async (draftId, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, opts.project);

      await requireHighImpactConfirmation(
        writer,
        Boolean(opts.yes),
        'Create this issue in the linked GitHub repository?',
        '--yes is required to approve a GitHub issue draft in machine mode.',
      );
      const { issue: created } = await client.approveGithubDraft(projectId, draftId, { title: opts.title, body: opts.body });

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Created issue #${created.issueNumber}  ${created.issueUrl}`);
        console.log();
      }
      writer.ok(created, { summary: `Created issue #${created.issueNumber}` });
    });

  drafts
    .command('reject <draftId>')
    .description('Reject a pending draft; automation will not propose that theme again')
    .option('--project <id-or-name>', 'Project ID or name')
    .action(async (draftId, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, opts.project);
      const result = await client.rejectGithubDraft(projectId, draftId);

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Draft rejected`);
        console.log();
      }
      writer.ok(result, { summary: 'Draft rejected' });
    });

  const automation = github.command('automation').description('Control automatic issue creation');
  automation
    .command('set')
    .description('Change automation settings; omitted options keep their value')
    .option('--project <id-or-name>', 'Project ID or name')
    .option('--mode <mode>', 'off, approval (queue drafts), or auto (create issues)')
    .option('--categories <list>', 'Comma-separated: BUG, FEATURE_REQUEST, IMPROVEMENT')
    .option('--min-confidence <n>', 'AI confidence from 0 to 1')
    .option('--bug-min-reports <n>', 'Reports needed before a bug becomes an issue (1-50)')
    .option('--other-min-reports <n>', 'Reports needed for features and improvements (1-50)')
    .option('--daily-cap <n>', 'Most issues created automatically per day (1-50)')
    .option('--close-loop <on|off>', 'Resolve feedback and email reporters when an issue closes')
    .option('--yes', 'Confirm the automation change')
    .action(async (opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, opts.project);

      const settings: Partial<GithubAutomation> = {};
      if (opts.mode !== undefined) {
        if (!(MODES as readonly string[]).includes(opts.mode)) throw errUsage(`--mode must be one of: ${MODES.join(', ')}`);
        settings.mode = opts.mode;
      }
      if (opts.categories !== undefined) {
        const list = String(opts.categories).split(',').map((item) => item.trim().toUpperCase()).filter(Boolean);
        if (list.some((item) => !(CATEGORIES as readonly string[]).includes(item))) {
          throw errUsage(`--categories must use: ${CATEGORIES.join(', ')}`);
        }
        settings.categories = list as GithubAutomation['categories'];
      }
      if (opts.minConfidence !== undefined) {
        const value = Number(opts.minConfidence);
        if (!Number.isFinite(value) || value < 0 || value > 1) throw errUsage('--min-confidence must be between 0 and 1');
        settings.minConfidence = value;
      }
      const bug = parseIntOption(opts.bugMinReports, '--bug-min-reports', 1, 50);
      if (bug !== undefined) settings.bugMinReports = bug;
      const other = parseIntOption(opts.otherMinReports, '--other-min-reports', 1, 50);
      if (other !== undefined) settings.otherMinReports = other;
      const cap = parseIntOption(opts.dailyCap, '--daily-cap', 1, 50);
      if (cap !== undefined) settings.dailyCap = cap;
      if (opts.closeLoop !== undefined) {
        if (!['on', 'off'].includes(opts.closeLoop)) throw errUsage('--close-loop must be on or off');
        settings.closeLoop = opts.closeLoop === 'on';
      }
      if (Object.keys(settings).length === 0) throw errUsage('Pass at least one setting to change');

      await requireHighImpactConfirmation(
        writer,
        Boolean(opts.yes),
        `Change GitHub automation${settings.mode === 'auto' ? ' (issues will be created without review)' : ''}?`,
        '--yes is required to change GitHub automation in machine mode.',
      );
      const result = await client.updateGithubAutomation(projectId, settings);

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Automation: ${result.automation.mode}`);
        console.log();
      }
      writer.ok(result.automation, { summary: `Automation mode: ${result.automation.mode}` });
    });

  return github;
}
