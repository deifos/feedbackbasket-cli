import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand, divider } from '../output/theme.js';
import { resolveProject } from '../resolve.js';
import type { OutputWriter } from '../output/writer.js';
import type { FeedbackFlowSettings, WidgetSettings } from '../types.js';

const DEFAULT_FEEDBACK_FLOW: FeedbackFlowSettings = {
  enabled: false,
  mode: 'guided',
  types: [
    {
      id: 'bug',
      emoji: '🐞',
      label: 'Bug report',
      description: 'Something is broken or not working',
      questions: [
        { id: 'steps', label: 'What steps can reproduce it?', type: 'textarea', placeholder: 'Tell us what you did before the issue happened.' },
        { id: 'expected', label: 'What did you expect to happen?', type: 'textarea', placeholder: 'Describe the result you expected.' },
        { id: 'urgency', label: 'How urgent is this?', type: 'single_choice', options: ['Low', 'Medium', 'High'] },
      ],
    },
    {
      id: 'feature',
      emoji: '💡',
      label: 'Feature request',
      description: 'Suggest an idea or improvement',
      questions: [
        { id: 'problem', label: 'What problem are you trying to solve?', type: 'textarea', placeholder: 'Share the job this feature would help with.' },
        { id: 'benefit', label: 'Who would benefit from this?', type: 'text', placeholder: 'For example: admins, customers, teammates.' },
        { id: 'importance', label: 'How important is this?', type: 'single_choice', options: ['Nice to have', 'Important', 'Critical'] },
      ],
    },
    {
      id: 'general',
      emoji: '💬',
      label: 'General feedback',
      description: 'Share thoughts, praise, or anything else',
      questions: [
        { id: 'context', label: 'What made you want to share this?', type: 'textarea', placeholder: 'Add any helpful context.' },
        { id: 'sentiment', label: 'How are you feeling about it?', type: 'single_choice', options: ['Happy', 'Neutral', 'Frustrated'] },
      ],
    },
  ],
};

export function createWidgetCommand(getWriter: () => OutputWriter): Command {
  const widget = new Command('widget')
    .description('Manage feedback widget');

  // --- widget settings ---
  widget
    .command('settings [project]')
    .description('View or update widget settings')
    .option('--color <hex>', 'Button color (e.g. #22c55e)')
    .option('--label <text>', 'Button label')
    .option('--position <pos>', 'Widget position (bottom-right, bottom-left, middle-right-edge, middle-left-edge, bottom-right-edge, bottom-left-edge)')
    .option('--intro <text>', 'Intro message shown in the widget')
    .option('--success <text>', 'Success message after submission')
    .option('--trigger <mode>', 'Trigger mode (floating, inline)')
    .option('--display <mode>', 'Display mode (modal, popup)')
    .option('--button-radius <px>', 'Button radius in pixels')
    .option('--button-size <size>', 'Button size (mini, regular)')
    .option('--icon <value>', 'Icon value (emoji or svg:chat-bubble-bottom-center-text)')
    .option('--email-required', 'Require email from submitters')
    .option('--no-email-required', 'Make email optional')
    .option('--show-email', 'Show the email field')
    .option('--no-show-email', 'Hide the email field')
    .option('--email-read-only', 'Lock the email field when userEmail is prefilled')
    .option('--no-email-read-only', 'Allow editing prefilled email')
    .option('--hide-email-when-prefilled', 'Hide the email field when userEmail is prefilled')
    .option('--no-hide-email-when-prefilled', 'Show the email field even when userEmail is prefilled')
    .option('--allow-attachments', 'Allow image attachments')
    .option('--no-allow-attachments', 'Disable image attachments')
    .option('--icon-only', 'Show only the icon, no label')
    .option('--no-icon-only', 'Show both icon and label')
    .option('--show-icon', 'Show an icon next to the label')
    .option('--no-show-icon', 'Hide the icon')
    .option('--show-branding', 'Show FeedbackBasket branding')
    .option('--no-show-branding', 'Hide FeedbackBasket branding when plan allows it')
    .option('--z-index <value>', 'Widget z-index')
    .option('--guided', 'Enable guided feedback types')
    .option('--disable-guided', 'Disable guided feedback types')
    .action(async (projectArg, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, projectArg);

      const hasUpdates = opts.color || opts.label || opts.position || opts.intro ||
        opts.success || opts.trigger || opts.display ||
        opts.buttonRadius || opts.buttonSize || opts.icon ||
        opts.emailRequired !== undefined || opts.showEmail !== undefined ||
        opts.emailReadOnly !== undefined || opts.hideEmailWhenPrefilled !== undefined ||
        opts.allowAttachments !== undefined || opts.iconOnly !== undefined ||
        opts.showIcon !== undefined || opts.showBranding !== undefined ||
        opts.zIndex || opts.guided || opts.disableGuided;

      if (hasUpdates) {
        if (opts.guided && opts.disableGuided) {
          throw errUsage('Choose either --guided or --disable-guided, not both');
        }

        // Update mode
        const settings: Partial<WidgetSettings> = {};
        if (opts.color) settings.buttonColor = opts.color;
        if (opts.label) settings.buttonLabel = opts.label;
        if (opts.position) settings.position = opts.position;
        if (opts.intro) settings.introMessage = opts.intro;
        if (opts.success) settings.successMessage = opts.success;
        if (opts.trigger) settings.triggerMode = opts.trigger;
        if (opts.display) settings.displayMode = opts.display;
        if (opts.buttonRadius) settings.buttonRadius = parseInt(opts.buttonRadius, 10);
        if (opts.buttonSize) settings.buttonSize = opts.buttonSize;
        if (opts.icon) settings.icon = opts.icon;
        if (opts.emailRequired !== undefined) settings.emailRequired = opts.emailRequired;
        if (opts.showEmail !== undefined) settings.showEmailField = opts.showEmail;
        if (opts.emailReadOnly !== undefined) settings.emailReadOnly = opts.emailReadOnly;
        if (opts.hideEmailWhenPrefilled !== undefined) settings.hideEmailFieldWhenPrefilled = opts.hideEmailWhenPrefilled;
        if (opts.allowAttachments !== undefined) settings.allowAttachments = opts.allowAttachments;
        if (opts.iconOnly !== undefined) settings.iconOnly = opts.iconOnly;
        if (opts.showIcon !== undefined) settings.showIcon = opts.showIcon;
        if (opts.showBranding !== undefined) settings.showBranding = opts.showBranding;
        if (opts.zIndex) settings.zIndex = parseInt(opts.zIndex, 10);
        if (opts.guided || opts.disableGuided) {
          const current = await client.getWidgetSettings(projectId);
          settings.feedbackFlow = {
            ...(current.settings.feedbackFlow ?? DEFAULT_FEEDBACK_FLOW),
            enabled: Boolean(opts.guided),
          };
        }

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
            { action: 'Configure guided questions', cmd: `feedbackbasket widget flow ${projectId} --enable` },
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
            { action: 'Enable guided flow', cmd: `feedbackbasket widget flow ${projectId} --enable` },
            { action: 'Get embed code', cmd: `feedbackbasket widget script ${projectId}` },
          ],
        });
      }
    });

  // --- widget flow ---
  widget
    .command('flow [project]')
    .description('View or update guided feedback types and follow-up questions')
    .option('--enable', 'Enable guided feedback flow')
    .option('--disable', 'Disable guided feedback flow')
    .option('--reset-default', 'Reset guided flow to the default Bug, Feature, and General templates')
    .option('--config <path>', 'Path to a JSON file containing a feedbackFlow object')
    .action(async (projectArg, opts) => {
      const writer = getWriter();
      const client = requireClient();
      const projectId = await resolveProjectId(client, projectArg);

      const hasUpdates = opts.enable || opts.disable || opts.resetDefault || opts.config;

      if (hasUpdates) {
        if (opts.enable && opts.disable) {
          throw errUsage('Choose either --enable or --disable, not both');
        }

        const current = await client.getWidgetSettings(projectId);
        let feedbackFlow = current.settings.feedbackFlow ?? DEFAULT_FEEDBACK_FLOW;

        if (opts.resetDefault) {
          feedbackFlow = cloneDefaultFeedbackFlow();
        }
        if (opts.config) {
          feedbackFlow = parseFeedbackFlowConfig(opts.config);
        }
        if (opts.enable) feedbackFlow = { ...feedbackFlow, enabled: true };
        if (opts.disable) feedbackFlow = { ...feedbackFlow, enabled: false };

        const result = await client.updateWidgetSettings(projectId, { feedbackFlow });

        if (!writer.isMachineOutput()) {
          console.log(`  ${brand.success('✓')} Guided feedback flow updated for ${brand.bold(result.projectName)}`);
          console.log();
          renderFeedbackFlow(result.settings.feedbackFlow);
        }

        writer.ok(result.settings.feedbackFlow, {
          summary: `Updated guided feedback flow for "${result.projectName}"`,
          breadcrumbs: [
            { action: 'View widget settings', cmd: `feedbackbasket widget settings ${projectId}` },
            { action: 'Get embed code', cmd: `feedbackbasket widget script ${projectId}` },
          ],
        });
        return;
      }

      const result = await client.getWidgetSettings(projectId);
      if (!writer.isMachineOutput()) {
        console.log(brand.bold(`Guided feedback flow — ${result.projectName}`));
        console.log(divider(40));
        console.log();
        renderFeedbackFlow(result.settings.feedbackFlow);
      }

      writer.ok(result.settings.feedbackFlow ?? DEFAULT_FEEDBACK_FLOW, {
        summary: `Guided feedback flow for "${result.projectName}"`,
        breadcrumbs: [
          { action: 'Enable guided flow', cmd: `feedbackbasket widget flow ${projectId} --enable` },
          { action: 'Reset templates', cmd: `feedbackbasket widget flow ${projectId} --reset-default --enable` },
          { action: 'Apply JSON config', cmd: `feedbackbasket widget flow ${projectId} --config ./feedback-flow.json` },
        ],
      });
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
        const settingsResult = await client.getWidgetSettings(projectId);

        console.log(brand.bold(`Widget embed code for ${result.projectName}`));
        console.log(divider(50));
        console.log();
        console.log(brand.muted('  Add this to your HTML, before </body>:'));
        console.log();
        console.log(`  ${brand.primary(result.embedCode)}`);
        console.log();
        console.log(brand.muted(`  Script URL: ${result.scriptUrl}`));
        console.log();
        renderInlineTriggerHelp(settingsResult.settings);
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

function cloneDefaultFeedbackFlow(): FeedbackFlowSettings {
  return JSON.parse(JSON.stringify(DEFAULT_FEEDBACK_FLOW)) as FeedbackFlowSettings;
}

function parseFeedbackFlowConfig(path: string): FeedbackFlowSettings {
  const raw = readFileSync(path, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  const candidate = isRecord(parsed) && isRecord(parsed.feedbackFlow)
    ? parsed.feedbackFlow
    : parsed;

  if (!isRecord(candidate) || !Array.isArray(candidate.types)) {
    throw errUsage('Feedback flow config must be a feedbackFlow object with a types array');
  }

  return {
    enabled: typeof candidate.enabled === 'boolean' ? candidate.enabled : true,
    mode: 'guided',
    types: candidate.types.map((type, index) => {
      if (!isRecord(type)) throw errUsage(`Feedback type at index ${index} must be an object`);
      const id = stringValue(type.id) || `type-${index + 1}`;
      const label = stringValue(type.label);
      if (!label) throw errUsage(`Feedback type "${id}" is missing label`);
      return {
        id,
        emoji: stringValue(type.emoji) || '💬',
        label,
        description: stringValue(type.description),
        questions: Array.isArray(type.questions)
          ? type.questions.map((question, qIndex) => {
              if (!isRecord(question)) throw errUsage(`Question ${qIndex + 1} in "${id}" must be an object`);
              const questionId = stringValue(question.id) || `question-${qIndex + 1}`;
              const questionLabel = stringValue(question.label);
              const questionType = stringValue(question.type);
              if (!questionLabel) throw errUsage(`Question "${questionId}" in "${id}" is missing label`);
              if (!['text', 'textarea', 'single_choice'].includes(questionType)) {
                throw errUsage(`Question "${questionId}" type must be text, textarea, or single_choice`);
              }
              return {
                id: questionId,
                label: questionLabel,
                type: questionType as 'text' | 'textarea' | 'single_choice',
                placeholder: stringValue(question.placeholder) || undefined,
                options: Array.isArray(question.options)
                  ? question.options.map(String).filter(Boolean)
                  : undefined,
              };
            })
          : [],
      };
    }),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function renderInlineTriggerHelp(settings: WidgetSettings): void {
  if (settings.triggerMode !== 'inline') return;

  console.log(brand.bold('Custom inline trigger'));
  console.log(divider(50));
  console.log();
  console.log(brand.muted('  Call this from your own button:'));
  console.log();
  console.log(`  ${brand.primary('<button onclick="window.FeedbackWidget.openFeedbackForm({ trigger: event.currentTarget })">')}`);
  console.log(`  ${brand.primary('  Feedback')}`);
  console.log(`  ${brand.primary('</button>')}`);
  console.log();

  if (settings.displayMode === 'popup') {
    console.log(brand.muted('  Passing the trigger keeps popup mode anchored beside your custom button.'));
  } else {
    console.log(brand.muted('  Modal mode stays centered; passing the trigger is safe for future popup changes.'));
  }

  console.log(brand.muted('  Existing calls to window.FeedbackWidget.openFeedbackForm() still work.'));
  console.log();
}

function renderWidgetSettings(projectName: string, settings: WidgetSettings): void {
  console.log(brand.bold(`Widget settings — ${projectName}`));
  console.log(divider(40));
  console.log();

  const display: [string, string][] = [
    ['Button Color', String(settings.buttonColor ?? '')],
    ['Button Label', String(settings.buttonLabel ?? '')],
    ['Button Radius', String(settings.buttonRadius ?? '')],
    ['Button Size', String(settings.buttonSize ?? '')],
    ['Icon', String(settings.icon ?? '')],
    ['Icon Only', String(settings.iconOnly ?? false)],
    ['Show Icon', String(settings.showIcon ?? true)],
    ['Position', String(settings.position ?? '')],
    ['Trigger Mode', String(settings.triggerMode ?? '')],
    ['Display Mode', String(settings.displayMode ?? '')],
    ['Show Email', String(settings.showEmailField ?? true)],
    ['Email Required', String(settings.emailRequired ?? false)],
    ['Email Read Only', String(settings.emailReadOnly ?? false)],
    ['Hide Prefilled Email', String(settings.hideEmailFieldWhenPrefilled ?? false)],
    ['Attachments', String(settings.allowAttachments ?? true)],
    ['Guided Flow', String(settings.feedbackFlow?.enabled ?? false)],
    ['Intro Message', String(settings.introMessage ?? '')],
    ['Success Message', String(settings.successMessage ?? '')],
    ['Z-Index', String(settings.zIndex ?? '')],
    ['Show Branding', String(settings.showBranding ?? true)],
  ];

  for (const [label, value] of display) {
    console.log(`  ${brand.label(label.padEnd(18))} ${value}`);
  }
  console.log();

  if (settings.feedbackFlow?.enabled) {
    renderFeedbackFlow(settings.feedbackFlow);
  }
}

function renderFeedbackFlow(flow: FeedbackFlowSettings | undefined): void {
  const feedbackFlow = flow ?? DEFAULT_FEEDBACK_FLOW;
  console.log(`  ${brand.label('Enabled'.padEnd(18))} ${feedbackFlow.enabled}`);
  console.log(`  ${brand.label('Mode'.padEnd(18))} ${feedbackFlow.mode}`);
  console.log();

  if (feedbackFlow.types.length === 0) {
    console.log(`  ${brand.muted('No feedback types configured')}`);
    console.log();
    return;
  }

  for (const type of feedbackFlow.types) {
    const heading = `${type.emoji ? `${type.emoji} ` : ''}${type.label} (${type.id})`;
    console.log(`  ${brand.bold(heading)}`);
    if (type.description) {
      console.log(`    ${brand.muted(type.description)}`);
    }
    if (type.questions.length === 0) {
      console.log(`    ${brand.muted('No follow-up questions')}`);
    } else {
      for (const question of type.questions) {
        const options = question.options?.length ? ` [${question.options.join(', ')}]` : '';
        console.log(`    - ${question.label} ${brand.muted(`(${question.type})${options}`)}`);
      }
    }
    console.log();
  }
}
