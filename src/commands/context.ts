import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { resolveProject } from '../resolve.js';

export function requireClient(): FeedbackBasketClient {
  const manager = new AuthManager();
  const token = manager.resolveToken();
  if (!token) throw errAuth();
  const config = loadConfig();
  return new FeedbackBasketClient(token, config.baseUrl);
}

/** Resolves --project (id or name) or falls back to the configured default. */
export async function resolveProjectId(
  client: FeedbackBasketClient,
  projectArg?: string,
): Promise<string> {
  if (projectArg) return (await resolveProject(client, projectArg)).id;
  const config = loadConfig();
  if (config.defaultProject) return config.defaultProject;
  throw errUsage(
    'Project is required. Pass --project <id-or-name> or set a default.',
    'feedbackbasket <command> --project <id-or-name>',
  );
}

export function parseIntOption(value: string | undefined, name: string, min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw errUsage(`${name} must be a whole number from ${min} to ${max}`);
  }
  return parsed;
}
