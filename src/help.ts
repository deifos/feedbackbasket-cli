import chalk from 'chalk';
import { brand, logo, divider } from './output/theme.js';
import { VERSION } from './version.js';

const INDENT = '    ';

function section(title: string): string {
  return chalk.bold(title.toUpperCase());
}

function cmd(name: string, desc: string, nameWidth = 16): string {
  return `${INDENT}${brand.command(name.padEnd(nameWidth))}  ${desc}`;
}

function flag(name: string, desc: string, nameWidth = 18): string {
  return `${INDENT}${name.padEnd(nameWidth)}  ${desc}`;
}

export function renderRootHelp(): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`  ${logo()} CLI ${brand.muted(`v${VERSION}`)}`);
  lines.push('');
  lines.push(`  ${brand.muted('The command-line interface for FeedbackBasket.')}`);
  lines.push(`  ${brand.muted('Manage projects, feedback, widgets, and team from your terminal.')}`);
  lines.push('');

  // Core Commands
  lines.push(section('  CORE COMMANDS'));
  lines.push(cmd('projects', 'Manage projects (create, show, update, delete)'));
  lines.push(cmd('feedback', 'View and manage feedback'));
  lines.push(cmd('bugs', 'View bug reports with severity'));
  lines.push(cmd('widget', 'Manage feedback widget & get embed code'));
  lines.push(cmd('team', 'Manage organization members'));
  lines.push('');

  // Shortcuts
  lines.push(section('  SHORTCUTS'));
  lines.push(cmd('login', 'Authenticate with FeedbackBasket'));
  lines.push(cmd('logout', 'Clear stored credentials'));
  lines.push('');

  // Search & Export
  lines.push(section('  SEARCH & EXPORT'));
  lines.push(cmd('feedback search', 'Search feedback across projects'));
  lines.push(cmd('feedback export', 'Export feedback to CSV, Markdown, or JSON'));
  lines.push(cmd('bugs stats', 'Bug statistics summary'));
  lines.push('');

  // Auth & Config
  lines.push(section('  AUTH & CONFIG'));
  lines.push(cmd('auth', 'Manage authentication (login, logout, status, token)'));
  lines.push(cmd('doctor', 'Run diagnostics to check CLI health'));
  lines.push(cmd('setup', 'Set up agent integrations (Claude Code)'));
  lines.push('');

  // Flags
  lines.push(section('  FLAGS'));
  lines.push(flag('-j, --json', 'Output as JSON envelope'));
  lines.push(flag('-q, --quiet', 'Quiet output (data only, no envelope)'));
  lines.push(flag('--agent', 'Agent mode (alias for --quiet)'));
  lines.push(flag('-m, --md', 'Output as Markdown'));
  lines.push(flag('--base-url <url>', 'API base URL override'));
  lines.push(flag('--help', 'Show help for command'));
  lines.push(flag('--version', 'Show version'));
  lines.push('');

  // Examples
  lines.push(section('  EXAMPLES'));
  lines.push(`${INDENT}${brand.muted('$')} feedbackbasket projects list`);
  lines.push(`${INDENT}${brand.muted('$')} feedbackbasket feedback create "Login bug" --project myapp --type bug`);
  lines.push(`${INDENT}${brand.muted('$')} feedbackbasket feedback list --category BUG --status OPEN`);
  lines.push(`${INDENT}${brand.muted('$')} feedbackbasket bugs list --severity high`);
  lines.push(`${INDENT}${brand.muted('$')} feedbackbasket widget script myapp`);
  lines.push(`${INDENT}${brand.muted('$')} feedbackbasket widget settings myapp --display modal`);
  lines.push(`${INDENT}${brand.muted('$')} feedbackbasket projects create "My App" --url https://myapp.com`);
  lines.push('');

  // Learn More
  lines.push(section('  LEARN MORE'));
  lines.push(`${INDENT}${brand.command('feedbackbasket <command> --help')}  Help for any command`);
  lines.push(`${INDENT}${brand.command('feedbackbasket doctor')}             Check CLI health`);
  lines.push(`${INDENT}${brand.muted('Docs:')} https://feedbackbasket.com/docs/cli`);
  lines.push('');

  return lines.join('\n');
}
