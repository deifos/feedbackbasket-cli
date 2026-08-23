import { errUsage } from './output/errors.js';
import { confirm } from './prompt.js';
import type { OutputWriter } from './output/writer.js';

export async function requireHighImpactConfirmation(
  writer: OutputWriter,
  confirmedByFlag: boolean,
  question: string,
  hint: string,
): Promise<void> {
  if (confirmedByFlag) return;
  if (writer.isMachineOutput() || !process.stdin.isTTY) {
    throw errUsage(hint, `${hint} Re-run the command with --yes.`);
  }
  if (!(await confirm(`  ${question}`, false))) throw errUsage('Action cancelled');
}
