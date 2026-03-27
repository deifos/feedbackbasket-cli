import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand, divider } from '../output/theme.js';
import { resolveProject } from '../resolve.js';
import type { OutputWriter } from '../output/writer.js';

export function createWidgetCommand(getWriter: () => OutputWriter): Command {
  const widget = new Command('widget')
    .description('Manage feedback widget');

  // --- widget settings ---
  widget
    .command('settings [project]')
    .description('View or update widget settings')
    .option('--color <hex>', 'Button color (e.g. #22c55e)')
    .option('--label <text>', 'Button label')
    .option('--position <pos>', 'Widget position (bottom-right, bottom-left, top-right, top-left)')
    .option('--intro <text>', 'Intro message shown in the widget')
    .option('--success <text>', 'Success message after submission')
    .option('--trigger <mode>', 'Trigger mode (floating, manual)')
    .option('--display <mode>', 'Display mode (modal, popover)')
    .option('--email-required', 'Require email from submitters')
    .option('--no-email-required', 'Make email optional')
    .option('--icon-only', 'Show only the icon, no label')
    .option('--no-icon-only', 'Show both icon and label')
    .action(async (projectArg, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, projectArg);

      const hasUpdates = opts.color || opts.label || opts.position || opts.intro ||
        opts.success || opts.trigger || opts.display ||
        opts.emailRequired !== undefined || opts.iconOnly !== undefined;

      if (hasUpdates) {
        // Update mode
        const settings: Record<string, unknown> = {};
        if (opts.color) settings.buttonColor = opts.color;
        if (opts.label) settings.buttonLabel = opts.label;
        if (opts.position) settings.position = opts.position;
        if (opts.intro) settings.introMessage = opts.intro;
        if (opts.success) settings.successMessage = opts.success;
        if (opts.trigger) settings.triggerMode = opts.trigger;
        if (opts.display) settings.displayMode = opts.display;
        if (opts.emailRequired !== undefined) settings.emailRequired = opts.emailRequired;
        if (opts.iconOnly !== undefined) settings.iconOnly = opts.iconOnly;

        const result = await client.updateWidgetSettings(projectId, settings);

        if (!writer.isMachineOutput()) {
          console.log(`  ${brand.success('✓')} Widget settings updated for ${brand.bold(result.projectName)}`);
          console.log();
        }

        writer.ok(result.settings, {
          summary: `Updated widget for "${result.projectName}"`,
          breadcrumbs: [
            { action: 'Get embed code', cmd: `feedbackbasket widget script ${projectId}` },
            { action: 'View settings', cmd: `feedbackbasket widget settings ${projectId}` },
          ],
        });
      } else {
        // View mode
        const result = await client.getWidgetSettings(projectId);

        if (!writer.isMachineOutput()) {
          renderWidgetSettings(result.projectName, result.settings);
        }

        writer.ok(result.settings, {
          summary: `Widget settings for "${result.projectName}"`,
          breadcrumbs: [
            { action: 'Update color', cmd: `feedbackbasket widget settings ${projectId} --color "#22c55e"` },
            { action: 'Get embed code', cmd: `feedbackbasket widget script ${projectId}` },
          ],
        });
      }
    });

  // --- widget script ---
  widget
    .command('script [project]')
    .description('Get the embed script for your website')
    .action(async (projectArg) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, projectArg);

      const result = await client.getWidgetScript(projectId);

      if (!writer.isMachineOutput()) {
        console.log(brand.bold(`Widget embed code for ${result.projectName}`));
        console.log(divider(50));
        console.log();
        console.log(brand.muted('  Add this to your HTML, before </body>:'));
        console.log();
        console.log(`  ${brand.primary(result.embedCode)}`);
        console.log();
        console.log(brand.muted(`  Script URL: ${result.scriptUrl}`));
        console.log();
      }

      writer.ok(result, {
        summary: `Embed code for "${result.projectName}"`,
        breadcrumbs: [
          { action: 'Customize widget', cmd: `feedbackbasket widget settings ${projectId}` },
          { action: 'View project', cmd: `feedbackbasket projects show ${projectId}` },
        ],
      });
    });

  return widget;
}

function requireClient(): FeedbackBasketClient {
  const manager = new AuthManager();
  const token = manager.resolveToken();
  if (!token) throw errAuth();
  const config = loadConfig();
  return new FeedbackBasketClient(token, config.baseUrl);
}

async function resolveProjectId(client: FeedbackBasketClient, projectArg?: string): Promise<string> {
  if (projectArg) {
    const project = await resolveProject(client, projectArg);
    return project.id;
  }
  const config = loadConfig();
  if (config.defaultProject) return config.defaultProject;
  throw errUsage(
    'Project is required. Pass a project name/ID or set a default.',
    'feedbackbasket widget settings <project> or feedbackbasket config set defaultProject <id>',
  );
}

function renderWidgetSettings(projectName: string, settings: Record<string, unknown>): void {
  console.log(brand.bold(`Widget settings — ${projectName}`));
  console.log(divider(40));
  console.log();

  const display: [string, string][] = [
    ['Button Color', String(settings.buttonColor ?? '')],
    ['Button Label', String(settings.buttonLabel ?? '')],
    ['Button Radius', String(settings.buttonRadius ?? '')],
    ['Icon Only', String(settings.iconOnly ?? false)],
    ['Show Icon', String(settings.showIcon ?? true)],
    ['Position', String(settings.position ?? '')],
    ['Trigger Mode', String(settings.triggerMode ?? '')],
    ['Display Mode', String(settings.displayMode ?? '')],
    ['Email Required', String(settings.emailRequired ?? false)],
    ['Intro Message', String(settings.introMessage ?? '')],
    ['Success Message', String(settings.successMessage ?? '')],
    ['Z-Index', String(settings.zIndex ?? '')],
    ['Show Branding', String(settings.showBranding ?? true)],
  ];

  for (const [label, value] of display) {
    console.log(`  ${brand.label(label.padEnd(18))} ${value}`);
  }
  console.log();
}
