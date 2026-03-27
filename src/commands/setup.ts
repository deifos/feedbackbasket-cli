import { Command } from 'commander';
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { brand } from '../output/theme.js';
import type { OutputWriter } from '../output/writer.js';

export function createSetupCommand(getWriter: () => OutputWriter): Command {
  const setup = new Command('setup')
    .description('Set up agent integrations');

  setup
    .command('claude')
    .description('Install FeedbackBasket skill for Claude Code')
    .action(() => {
      const writer = getWriter();
      const results: { step: string; status: 'ok' | 'skip' | 'fail'; message: string }[] = [];

      const claudeDir = join(homedir(), '.claude');
      const claudeExists = existsSync(claudeDir);

      if (!claudeExists) {
        results.push({
          step: 'Detect Claude Code',
          status: 'fail',
          message: `~/.claude/ not found. Is Claude Code installed?`,
        });

        if (!writer.isMachineOutput()) {
          console.log(brand.error('Claude Code not detected'));
          console.log(brand.muted('  ~/.claude/ directory not found'));
          console.log(brand.muted('  Install Claude Code first: https://claude.ai/code'));
        }

        writer.ok({ installed: false, results }, {
          summary: 'Claude Code not detected',
        });
        return;
      }

      const skillDir = join(claudeDir, 'skills', 'feedbackbasket');
      const skillDest = join(skillDir, 'SKILL.md');

      try {
        const thisDir = dirname(fileURLToPath(import.meta.url));
        const projectRoot = join(thisDir, '..', '..', '..');
        const skillSrc = join(projectRoot, 'skills', 'feedbackbasket', 'SKILL.md');

        if (!existsSync(skillSrc)) {
          const altSrc = join(thisDir, '..', '..', 'skills', 'feedbackbasket', 'SKILL.md');
          if (!existsSync(altSrc)) {
            results.push({
              step: 'Copy skill file',
              status: 'fail',
              message: 'SKILL.md source not found in package',
            });

            writer.ok({ installed: false, results }, {
              summary: 'Skill file not found',
            });
            return;
          }
          mkdirSync(skillDir, { recursive: true });
          copyFileSync(altSrc, skillDest);
        } else {
          mkdirSync(skillDir, { recursive: true });
          copyFileSync(skillSrc, skillDest);
        }

        results.push({
          step: 'Install skill',
          status: 'ok',
          message: skillDest,
        });
      } catch (error) {
        results.push({
          step: 'Install skill',
          status: 'fail',
          message: error instanceof Error ? error.message : String(error),
        });
      }

      if (!writer.isMachineOutput()) {
        for (const r of results) {
          const icon = r.status === 'ok' ? brand.success('✓') : r.status === 'skip' ? brand.warning('-') : brand.error('✗');
          console.log(`  ${icon} ${r.step}: ${r.message}`);
        }
        console.log();
      }

      const allOk = results.every(r => r.status !== 'fail');

      writer.ok({ installed: allOk, results }, {
        summary: allOk ? 'FeedbackBasket skill installed for Claude Code' : 'Setup completed with errors',
        breadcrumbs: [
          { action: 'Start a new Claude Code session to use FeedbackBasket commands', cmd: 'claude' },
          { action: 'Run diagnostics', cmd: 'feedbackbasket doctor' },
        ],
      });
    });

  return setup;
}
