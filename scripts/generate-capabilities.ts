import assert from 'node:assert/strict';
import fs from 'node:fs';
import { AGENT_SURFACE_VERSION, PRODUCT_OPERATIONS } from 'feedbackbasket-agent-contract';

const START = '<!-- BEGIN GENERATED AGENT CAPABILITIES -->';
const END = '<!-- END GENERATED AGENT CAPABILITIES -->';

function capabilityTable(): string {
  const lines = [
    START,
    '## Agent capability contract',
    '',
    `Agent surface version: \`${AGENT_SURFACE_VERSION}\`. The CLI and both MCP transports implement the same ${PRODUCT_OPERATIONS.length} product operations.`,
    '',
    '| Product operation | CLI command | MCP tool | Required access | Confirm |',
    '| --- | --- | --- | --- | --- |',
  ];
  for (const operation of PRODUCT_OPERATIONS) {
    const commands = operation.cli.commands.map((command) => `\`${command}\``).join('<br>');
    const access = operation.access.unrestrictedKeyRequired
      ? `${operation.access.scope}; unrestricted key`
      : operation.access.projectScoped
        ? `${operation.access.scope}; allowed project`
        : operation.access.scope;
    lines.push(
      `| \`${operation.id}\` | ${commands} | \`${operation.mcp.name}\` | \`${access}\` | ${operation.risk.explicitConfirmation ? 'Yes' : 'No'} |`,
    );
  }
  lines.push(END);
  return lines.join('\n');
}

const readmePath = new URL('../README.md', import.meta.url);
const source = fs.readFileSync(readmePath, 'utf8');
const start = source.indexOf(START);
const end = source.indexOf(END);
assert.ok(start >= 0 && end > start, 'README capability markers are missing.');
const expected = source.slice(0, start) + capabilityTable() + source.slice(end + END.length);
if (process.argv.includes('--check')) {
  assert.equal(source, expected, 'README capability table is stale. Run npm run docs:generate.');
} else {
  fs.writeFileSync(readmePath, expected);
}

