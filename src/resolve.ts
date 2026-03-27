import { FeedbackBasketClient } from './client.js';
import { errNotFound, errUsage } from './output/errors.js';
import type { Project } from './types.js';

// CUIDs look like: cmn3c7sgv000004jx16lhl07o (25 chars, starts with c, alphanumeric)
function looksLikeId(input: string): boolean {
  return /^c[a-z0-9]{20,}$/.test(input);
}

/**
 * Resolve a project by ID or name.
 * - If input looks like a cuid, treat as ID
 * - Otherwise, fetch all projects and match by name (case-insensitive)
 * - Supports partial matching (e.g. "feedback" matches "feedbackbasket")
 */
export async function resolveProject(client: FeedbackBasketClient, input: string): Promise<Project> {
  // Direct ID lookup
  if (looksLikeId(input)) {
    return client.getProject(input);
  }

  // Name-based lookup — fetch all projects and match
  const result = await client.listProjects();
  const projects = result.projects;

  if (projects.length === 0) {
    throw errNotFound('project', input);
  }

  const lower = input.toLowerCase();

  // 1. Exact match (case-insensitive)
  const exact = projects.filter(p => p.name.toLowerCase() === lower);
  if (exact.length === 1) return exact[0]!;

  // 2. Starts-with match
  const startsWith = projects.filter(p => p.name.toLowerCase().startsWith(lower));
  if (startsWith.length === 1) return startsWith[0]!;

  // 3. Contains match
  const contains = projects.filter(p => p.name.toLowerCase().includes(lower));
  if (contains.length === 1) return contains[0]!;

  // Ambiguous — multiple matches
  if (contains.length > 1) {
    const names = contains.map(p => `  - ${p.name} (${p.id})`).join('\n');
    throw errUsage(
      `Ambiguous project name "${input}" — matches ${contains.length} projects:\n${names}`,
      `Use the full project ID or a more specific name`,
    );
  }

  // Not found — suggest similar names
  const suggestions = projects
    .map(p => ({ name: p.name, dist: levenshtein(lower, p.name.toLowerCase()) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3)
    .filter(s => s.dist <= Math.max(input.length * 0.6, 3))
    .map(s => s.name);

  if (suggestions.length > 0) {
    throw errUsage(
      `Project "${input}" not found. Did you mean: ${suggestions.join(', ')}?`,
      `Use feedbackbasket projects list to see all projects`,
    );
  }

  throw errNotFound('project', input);
}

// Simple Levenshtein distance for typo suggestions
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0) as number[]);

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i]![j] = a[i - 1] === b[j - 1]
        ? dp[i - 1]![j - 1]!
        : 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
    }
  }

  return dp[m]![n]!;
}
