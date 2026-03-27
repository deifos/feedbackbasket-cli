import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { VERSION } from '../version.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig, configDir } from '../config/config.js';
import { FeedbackBasketClient } from '../client.js';
import { brand, divider, logo } from '../output/theme.js';
import type { OutputWriter } from '../output/writer.js';

interface Check {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
  hint?: string;
}

export function createDoctorCommand(getWriter: () => OutputWriter): Command {
  return new Command('doctor')
    .description('Run diagnostics to check CLI health')
    .option('--verbose', 'Show detailed diagnostic output')
    .action(async () => {
      const writer = getWriter();
      const checks: Check[] = [];

      // 1. CLI version
      checks.push({
        name: 'CLI version',
        status: 'pass',
        message: `v${VERSION}`,
      });

      // 2. Config directory
      const dir = configDir();
      checks.push({
        name: 'Config directory',
        status: existsSync(dir) ? 'pass' : 'warn',
        message: existsSync(dir) ? dir : `${dir} (not created yet)`,
        hint: !existsSync(dir) ? 'Will be created on first auth login' : undefined,
      });

      // 3. Authentication
      const manager = new AuthManager();
      const token = manager.resolveToken();
      if (token) {
        checks.push({
          name: 'Authentication',
          status: 'pass',
          message: `Authenticated via ${manager.getSource()} (${manager.getTokenPreview()})`,
        });
      } else {
        checks.push({
          name: 'Authentication',
          status: 'fail',
          message: 'Not authenticated',
          hint: 'Run: feedbackbasket auth login',
        });
      }

      // 4. API connectivity
      if (token) {
        const config = loadConfig();
        const client = new FeedbackBasketClient(token, config.baseUrl);

        try {
          const start = Date.now();
          await client.listProjects();
          const elapsed = Date.now() - start;

          checks.push({
            name: 'API connectivity',
            status: 'pass',
            message: `${config.baseUrl} (${elapsed}ms)`,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          checks.push({
            name: 'API connectivity',
            status: 'fail',
            message,
            hint: 'Check your internet connection and base URL',
          });
        }
      } else {
        checks.push({
          name: 'API connectivity',
          status: 'skip',
          message: 'Skipped (not authenticated)',
        });
      }

      // 5. Claude Code integration
      const claudeSkillPath = join(homedir(), '.claude', 'skills', 'feedbackbasket', 'SKILL.md');
      if (existsSync(claudeSkillPath)) {
        checks.push({
          name: 'Claude Code skill',
          status: 'pass',
          message: 'Installed',
        });
      } else {
        checks.push({
          name: 'Claude Code skill',
          status: 'warn',
          message: 'Not installed',
          hint: 'Run: feedbackbasket setup claude',
        });
      }

      // Render
      if (!writer.isMachineOutput()) {
        renderChecks(checks);
      }

      const passed = checks.filter(c => c.status === 'pass').length;
      const failed = checks.filter(c => c.status === 'fail').length;
      const warned = checks.filter(c => c.status === 'warn').length;

      writer.ok(
        { checks, passed, failed, warned },
        {
          summary: `${passed} passed, ${failed} failed, ${warned} warnings`,
          breadcrumbs: failed > 0
            ? [{ action: 'Authenticate', cmd: 'feedbackbasket auth login' }]
            : [{ action: 'List projects', cmd: 'feedbackbasket projects list' }],
        },
      );
    });
}

const statusIcon: Record<string, string> = {
  pass: brand.success('  ✓'),
  fail: brand.error('  ✗'),
  warn: brand.warning('  !'),
  skip: brand.muted('  -'),
};

function renderChecks(checks: Check[]): void {
  console.log(`${logo()} CLI Diagnostics`);
  console.log(divider(40));
  console.log();

  for (const check of checks) {
    const icon = statusIcon[check.status] ?? '  ?';
    console.log(`${icon} ${brand.bold(check.name)}: ${check.message}`);
    if (check.hint) {
      console.log(`      ${brand.muted(check.hint)}`);
    }
  }
  console.log();
}
