import assert from "node:assert/strict";
import test from "node:test";
import { isCliTokenFormat, validateReturnedScope } from "../src/auth/login.js";
import {
  authLoginResult,
  resolveAuthScope,
} from "../src/commands/auth.js";

test("CLI authentication accepts only CLI credential format", () => {
  assert.equal(isCliTokenFormat(`fb_cli_${"a".repeat(64)}`), true);
  assert.equal(isCliTokenFormat(`fb_key_${"a".repeat(64)}`), false);
  assert.equal(isCliTokenFormat("invalid"), false);
});

test("authentication supports read and full access only", () => {
  assert.equal(resolveAuthScope("read"), "read");
  assert.equal(resolveAuthScope("full"), "full");
  assert.throws(() => resolveAuthScope("admin"), /Scope must be/);
});

test("browser authentication stores the selected access level", () => {
  assert.equal(validateReturnedScope("read", "full"), "read");
  assert.equal(validateReturnedScope("full", "full"), "full");
  assert.equal(validateReturnedScope("read", "read"), "read");
  assert.throws(
    () => validateReturnedScope(null, "full"),
    /did not include a valid access level/,
  );
  assert.throws(
    () => validateReturnedScope("full", "read"),
    /exceeds the requested access maximum/,
  );
});

test("machine output reports the browser-selected access level", () => {
  assert.deepEqual(authLoginResult("owner@example.test", "read", "project-a"), {
    authenticated: true,
    email: "owner@example.test",
    scope: "read",
    defaultProject: "project-a",
  });
});
