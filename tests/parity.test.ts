import assert from "node:assert/strict";
import test from "node:test";
import { PRODUCT_OPERATIONS } from "feedbackbasket-agent-contract";
import type { Command } from "commander";
import { createProgram } from "../src/cli.js";
import { CLI_CAPABILITIES, CLI_EXEMPTIONS } from "../src/capabilities.js";
import { VERSION } from "../src/version.js";
import { verifyCliParity } from "../scripts/check-parity.js";

function findCommand(parent: Command, token: string): Command | undefined {
  return parent.commands.find(
    (command) => command.name() === token || command.aliases().includes(token),
  );
}

function hasCommand(program: Command, commandPath: string): boolean {
  let current = program;
  for (const token of commandPath.split(" ")) {
    const child = findCommand(current, token);
    if (!child) return false;
    current = child;
  }
  return true;
}

test("the Commander tree exposes every contract command mapping", () => {
  const program = createProgram();
  for (const operation of PRODUCT_OPERATIONS) {
    for (const command of operation.cli.commands) {
      assert.equal(
        hasCommand(program, command),
        true,
        `${operation.id}: ${command}`,
      );
    }
  }
  assert.equal(CLI_CAPABILITIES.length, 31);
  assert.equal(VERSION, "3.1.0");
});

test("transport commands have declared exemptions", () => {
  const exempt = new Set(CLI_EXEMPTIONS.map(({ id }) => id));
  for (const command of ["auth", "login", "logout", "doctor", "setup"]) {
    assert.equal(exempt.has(command), true, command);
  }
});

test("all high-impact commands support --yes", () => {
  const program = createProgram();
  for (const operation of PRODUCT_OPERATIONS.filter(
    (item) => item.risk.explicitConfirmation,
  )) {
    for (const commandPath of operation.cli.commands) {
      let current = program;
      for (const token of commandPath.split(" "))
        current = findCommand(current, token)!;
      assert.ok(
        current.options.some((option) => option.long === "--yes"),
        `${operation.id}: ${commandPath}`,
      );
    }
  }
});

test("the prepublish check rejects version and mapping drift", () => {
  assert.throws(
    () => verifyCliParity("2.9.9"),
    /Expected values to be strictly equal/,
  );
  assert.throws(
    () =>
      verifyCliParity(
        "3.1.0",
        PRODUCT_OPERATIONS.slice(0, -1).map(({ id }) => id),
      ),
    /Expected values to be strictly deep-equal/,
  );
});
