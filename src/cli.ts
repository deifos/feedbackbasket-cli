import { Command } from 'commander';
import { VERSION } from './version.js';
import { OutputWriter, Format } from './output/writer.js';
import { CLIError } from './output/errors.js';
import { exitCodeFor } from './output/codes.js';
import { setBaseUrlOverride } from './config/config.js';
import { createAuthCommand, createLoginCommand, createLogoutCommand } from './commands/auth.js';
import { createProjectsCommand } from './commands/projects.js';
import { createFeedbackCommand } from './commands/feedback.js';
import { createBugsCommand } from './commands/bugs.js';
import { createDoctorCommand } from './commands/doctor.js';
import { createSetupCommand } from './commands/setup.js';
import { createWidgetCommand } from './commands/widget.js';
import { createTeamCommand } from './commands/team.js';
import { createFeedbackUpdateCommand } from './commands/feedback-update.js';
import { createFeedbackNoteCommand } from './commands/feedback-note.js';

let writer: OutputWriter;

function resolveFormat(opts: { json?: boolean; quiet?: boolean; agent?: boolean; md?: boolean }): Format {
  if (opts.agent || opts.quiet) return Format.Quiet;
  if (opts.json) return Format.JSON;
  if (opts.md) return Format.Markdown;
  return Format.Auto;
}

function getWriter(): OutputWriter {
  return writer;
}

export function run(): void {
  const program = new Command('feedbackbasket')
    .version(VERSION, '-v, --version')
    .description('Command-line interface for FeedbackBasket')
    .option('--json', 'Output as JSON envelope')
    .option('--quiet', 'Output raw data only (no envelope)')
    .option('--agent', 'Agent mode (alias for --quiet)')
    .option('--md', 'Output as Markdown')
    .option('--base-url <url>', 'API base URL override')
    .hook('preAction', (thisCommand) => {
      const opts = thisCommand.opts();
      const format = resolveFormat(opts);
      writer = new OutputWriter({ format });
      if (opts.baseUrl) {
        setBaseUrlOverride(opts.baseUrl);
      }
    });

  // Register commands
  program.addCommand(createAuthCommand(getWriter));
  program.addCommand(createLoginCommand(getWriter));   // alias: feedbackbasket login
  program.addCommand(createLogoutCommand(getWriter));  // alias: feedbackbasket logout
  program.addCommand(createProjectsCommand(getWriter));
  program.addCommand(createFeedbackCommand(getWriter));
  program.addCommand(createBugsCommand(getWriter));
  program.addCommand(createWidgetCommand(getWriter));
  program.addCommand(createTeamCommand(getWriter));
  program.addCommand(createDoctorCommand(getWriter));
  program.addCommand(createSetupCommand(getWriter));

  // Global error handler
  program.exitOverride();

  (async () => {
    try {
      await program.parseAsync(process.argv);
    } catch (error) {
      if (error instanceof CLIError) {
        if (!writer) {
          writer = new OutputWriter({ format: Format.Auto });
        }
        writer.err(error);
        process.exit(error.exitCode);
      }

      // Commander's own errors (help, version, etc.)
      if (error instanceof Error && 'exitCode' in error) {
        const exitCode = (error as { exitCode: number }).exitCode;
        process.exit(exitCode);
      }

      // Unknown errors
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  })();
}
