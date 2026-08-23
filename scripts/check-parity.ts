import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_SURFACE_VERSION, PRODUCT_OPERATIONS } from 'feedbackbasket-agent-contract';
import { CLI_CAPABILITIES } from '../src/capabilities.js';
import { createProgram } from '../src/cli.js';
import { VERSION } from '../src/version.js';
import type { Command } from 'commander';

function hasCommand(program: Command, commandPath: string): boolean {
  let current = program;
  for (const token of commandPath.split(' ')) {
    const child = current.commands.find((command) => (
      command.name() === token || command.aliases().includes(token)
    ));
    assert.ok(child, `Missing CLI command mapping: ${commandPath}`);
    current = child;
  }
  return true;
}

export function verifyCliParity(
  packageVersion: string,
  operationIds: readonly string[] = CLI_CAPABILITIES.map(({ operationId }) => operationId),
): void {
  assert.equal(packageVersion, AGENT_SURFACE_VERSION);
  assert.equal(VERSION, AGENT_SURFACE_VERSION);
  assert.deepEqual(operationIds, PRODUCT_OPERATIONS.map(({ id }) => id));
  const program = createProgram();
  for (const operation of PRODUCT_OPERATIONS) {
    for (const command of operation.cli.commands) assert.equal(hasCommand(program, command), true);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8')) as { version: string };
  verifyCliParity(packageJson.version);
  console.log(`FeedbackBasket CLI ${AGENT_SURFACE_VERSION}: ${CLI_CAPABILITIES.length} operation mappings`);
}
