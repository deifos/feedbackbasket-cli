import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { AuthManager } from '../auth/manager.js';
import { browserLogin, isCliTokenFormat, manualLogin } from '../auth/login.js';
import { saveCredentials, loadCredentials } from '../config/credentials.js';
import { loadConfig, saveConfig } from '../config/config.js';
import { FeedbackBasketClient } from '../client.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand, divider, logo } from '../output/theme.js';
import { select, confirm } from '../prompt.js';
import type { OutputWriter } from '../output/writer.js';

export function createAuthCommand(getWriter: () => OutputWriter): Command {
  const auth = new Command('auth')
    .description('Manage authentication');

  // --- auth login ---
  auth
    .command('login')
    .description('Authenticate with FeedbackBasket')
    .option('--token <token>', 'Use an API token directly (for CI/headless)')
    .option('--manual', 'Show a browser token to paste back into the terminal')
    .option('--scope <scope>', 'Access scope: read or full', 'full')
    .action(async (opts) => {
      const writer = getWriter();
      const config = loadConfig();
      const scope = opts.scope === 'read' ? 'read' as const : 'full' as const;
      const isInteractive = !writer.isMachineOutput() && process.stdin.isTTY;

      // ── Step 1: Authentication ──
      if (isInteractive) {
        console.log();
        console.log(`  ${logo()} CLI`);
        console.log();
        console.log(brand.muted(`  Step 1: Authentication`));
        console.log();
      }

      let token: string;

      if (opts.token) {
        token = opts.token;
      } else if (opts.manual) {
        const result = await manualLogin(config.baseUrl, scope);
        token = result.token;
      } else {
        const result = await browserLogin(config.baseUrl, scope);
        token = result.token;
      }

      if (!isCliTokenFormat(token)) {
        throw errUsage(
          'Expected a FeedbackBasket CLI token beginning with fb_cli_',
          'MCP API keys begin with fb_key_ and are only for MCP server configuration',
        );
      }

      // Verify token + get profile
      const client = new FeedbackBasketClient(token, config.baseUrl);
      let email: string | undefined;
      let userId: string | undefined;
      let organizationId: string | undefined;

      try {
        const profile = await client.me();
        email = profile.email;
        userId = profile.id;
        organizationId = profile.organizationId;
      } catch (err) {
        if (isInteractive) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log(brand.warning(`  Could not verify token: ${msg}`));
          console.log(brand.muted('  Token saved — run feedbackbasket doctor to diagnose'));
          console.log();
        }
      }

      saveCredentials({
        token,
        scope,
        userId,
        email,
        organizationId,
        createdAt: new Date().toISOString(),
      });

      if (isInteractive) {
        console.log(`  ${brand.success('✓')} Authentication successful`);
        if (email) console.log(`    ${brand.muted('Logged in as')} ${brand.bold(email)}`);
        console.log();
      }

      // ── Step 2: Default Project (interactive only, first login) ──
      let defaultProjectName: string | undefined;

      if (isInteractive && !config.defaultProject) {
        console.log();
        console.log(brand.muted(`  Step 2: Default Project (optional)`));
        console.log();

        try {
          const projectsRes = await client.listProjects();
          const projects = projectsRes.projects;

          if (projects.length === 0) {
            console.log(brand.muted('  No projects found. Create one from the dashboard.'));
            console.log();
          } else if (projects.length === 1) {
            // Auto-select single project
            const p = projects[0]!;
            config.defaultProject = p.id;
            saveConfig(config);
            defaultProjectName = p.name;
            console.log(`  ${brand.success('✓')} Default project: ${brand.bold(p.name)}`);
            console.log(`    ${brand.muted('Only project in your organization')}`);
            console.log();
          } else {
            console.log(`  You have ${brand.bold(String(projects.length))} projects:\n`);
            const choice = await select('Select default project', projects.map(p => {
              const count = brand.muted(`(${p.totalFeedback} feedback)`);
              return `${p.name} ${count}`;
            }));

            if (choice !== null) {
              const p = projects[choice]!;
              config.defaultProject = p.id;
              saveConfig(config);
              defaultProjectName = p.name;
              console.log();
              console.log(`  ${brand.success('✓')} Default project: ${brand.bold(p.name)}`);
              console.log(`    ${brand.muted('Use --project to override per-command')}`);
            } else {
              console.log();
              console.log(`  ${brand.muted('Skipped. Use --project or: feedbackbasket config set defaultProject <id>')}`);
            }
            console.log();
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log(brand.muted(`  Could not fetch projects: ${msg}`));
          console.log(brand.muted('  You can set a default later: feedbackbasket config set defaultProject <id>'));
          console.log();
        }
      }

      // ── Step 3: Agent Setup (interactive only) ──
      let agentInstalled = false;

      if (isInteractive) {
        const claudeDir = join(homedir(), '.claude');
        const skillPath = join(claudeDir, 'skills', 'feedbackbasket', 'SKILL.md');
        const claudeExists = existsSync(claudeDir);
        const skillExists = existsSync(skillPath);

        if (claudeExists && !skillExists) {
          console.log();
          console.log(brand.muted(`  Step 3: Agent Setup`));
          console.log();
          console.log(`  ${brand.primary('Detected:')} Claude Code`);
          console.log();
          console.log(`  This will:`);
          console.log(`    1. Install FeedbackBasket skill to ~/.claude/skills/`);
          console.log();

          const doSetup = await confirm('  Set up for Claude Code?');

          if (doSetup) {
            try {
              const { mkdirSync, copyFileSync } = await import('node:fs');
              const { dirname } = await import('node:path');
              const { fileURLToPath } = await import('node:url');

              const thisDir = dirname(fileURLToPath(import.meta.url));
              const projectRoot = join(thisDir, '..', '..', '..');
              let skillSrc = join(projectRoot, 'skills', 'feedbackbasket', 'SKILL.md');
              if (!existsSync(skillSrc)) {
                skillSrc = join(thisDir, '..', '..', 'skills', 'feedbackbasket', 'SKILL.md');
              }

              if (existsSync(skillSrc)) {
                const skillDir = join(claudeDir, 'skills', 'feedbackbasket');
                mkdirSync(skillDir, { recursive: true });
                copyFileSync(skillSrc, skillPath);
                agentInstalled = true;
                console.log(`  ${brand.success('✓')} Agent skill installed`);
              } else {
                console.log(`  ${brand.error('✗')} SKILL.md not found in package`);
              }
            } catch {
              console.log(`  ${brand.error('✗')} Failed to install skill`);
            }
          } else {
            console.log(brand.muted('  Skipped. Run later: feedbackbasket setup claude'));
          }
          console.log();
        } else if (claudeExists && skillExists) {
          agentInstalled = true;
        }
      }

      // ── Summary ──
      if (isInteractive) {
        console.log();
        console.log(divider(35));
        console.log(brand.bold('  Setup complete!'));
        console.log(divider(35));
        console.log();

        console.log(`  ${brand.success('✓')} Authenticated${email ? ` as ${email}` : ''}`);
        if (defaultProjectName) {
          console.log(`  ${brand.success('✓')} Default project: ${defaultProjectName}`);
        } else if (config.defaultProject) {
          console.log(`  ${brand.success('✓')} Default project: ${config.defaultProject}`);
        } else {
          console.log(`  ${brand.muted('-')} No default project`);
        }
        if (agentInstalled) {
          console.log(`  ${brand.success('✓')} Claude Code skill`);
        }

        console.log();
        console.log('  Try these commands:');
        console.log();
        console.log(`    ${brand.command('feedbackbasket projects list')}     List your projects`);
        console.log(`    ${brand.command('feedbackbasket feedback list')}     View recent feedback`);
        console.log(`    ${brand.command('feedbackbasket bugs list')}         View bug reports`);
        console.log(`    ${brand.command('feedbackbasket doctor')}            Run diagnostics`);
        console.log();

        return; // Skip the JSON output in interactive wizard mode
      }

      // Machine output
      writer.ok(
        { authenticated: true, email, scope, defaultProject: config.defaultProject },
        {
          summary: email ? `Logged in as ${email}` : 'Authenticated successfully',
          breadcrumbs: [
            { action: 'List projects', cmd: 'feedbackbasket projects list' },
            { action: 'Check status', cmd: 'feedbackbasket auth status' },
            { action: 'Run diagnostics', cmd: 'feedbackbasket doctor' },
          ],
        },
      );
    });

  // --- auth logout ---
  auth
    .command('logout')
    .description('Clear stored credentials')
    .action(() => {
      const writer = getWriter();
      const manager = new AuthManager();

      if (!manager.isAuthenticated()) {
        writer.ok({ authenticated: false }, { summary: 'Already logged out' });
        return;
      }

      if (manager.getSource() === 'env') {
        throw errUsage(
          'Credentials are set via FEEDBACKBASKET_TOKEN environment variable',
          'Unset the variable: unset FEEDBACKBASKET_TOKEN',
        );
      }

      manager.logout();

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Logged out`);
        console.log();
      }

      writer.ok({ authenticated: false }, {
        summary: 'Logged out',
        breadcrumbs: [
          { action: 'Log back in', cmd: 'feedbackbasket auth login' },
        ],
      });
    });

  // --- auth status ---
  auth
    .command('status')
    .description('Show authentication status')
    .action(() => {
      const writer = getWriter();
      const manager = new AuthManager();
      const creds = manager.getCredentials();

      if (!creds) {
        throw errAuth('Not authenticated');
      }

      const config = loadConfig();
      const data = {
        authenticated: true,
        source: manager.getSource(),
        token: manager.getTokenPreview(),
        scope: creds.scope,
        email: creds.email ?? null,
        organizationId: creds.organizationId ?? null,
        defaultProject: config.defaultProject ?? null,
      };

      writer.ok(data, {
        summary: `Authenticated${creds.email ? ` as ${creds.email}` : ''}`,
        breadcrumbs: [
          { action: 'List projects', cmd: 'feedbackbasket projects list' },
          { action: 'Log out', cmd: 'feedbackbasket auth logout' },
        ],
      });
    });

  // --- auth token ---
  auth
    .command('token')
    .description('Print the current access token (for scripting)')
    .action(() => {
      const manager = new AuthManager();
      const token = manager.resolveToken();

      if (!token) {
        throw errAuth('Not authenticated');
      }

      process.stdout.write(token);
    });

  return auth;
}

// Top-level aliases: `feedbackbasket login` and `feedbackbasket logout`
export function createLoginCommand(getWriter: () => OutputWriter): Command {
  return new Command('login')
    .description('Authenticate with FeedbackBasket (alias for auth login)')
    .option('--token <token>', 'Use an API token directly (for CI/headless)')
    .option('--manual', 'Show a browser token to paste back into the terminal')
    .option('--scope <scope>', 'Access scope: read or full', 'full')
    .action(async (opts) => {
      // Delegate to auth login by re-parsing
      const authCmd = createAuthCommand(getWriter);
      const args = ['node', 'feedbackbasket', 'login'];
      if (opts.token) args.push('--token', opts.token);
      if (opts.manual) args.push('--manual');
      if (opts.scope) args.push('--scope', opts.scope);
      await authCmd.parseAsync(args);
    });
}

export function createLogoutCommand(getWriter: () => OutputWriter): Command {
  return new Command('logout')
    .description('Clear stored credentials (alias for auth logout)')
    .action(async () => {
      const authCmd = createAuthCommand(getWriter);
      await authCmd.parseAsync(['node', 'feedbackbasket', 'logout']);
    });
}
