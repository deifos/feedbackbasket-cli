import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand, divider } from '../output/theme.js';
import { confirm } from '../prompt.js';
import { resolveProject } from '../resolve.js';
import type { OutputWriter } from '../output/writer.js';
import type { Project } from '../types.js';

export function createProjectsCommand(getWriter: () => OutputWriter): Command {
  const projects = new Command('projects')
    .alias('project')
    .description('Manage projects');

  // --- projects list ---
  projects
    .command('list')
    .description('List all accessible projects')
    .action(async () => {
      const writer = getWriter();
      const client = requireClient();

      const result = await client.listProjects();
      const data = result.projects;

      if (!writer.isMachineOutput()) {
        renderProjectsTable(data);
      }

      writer.ok(data, {
        summary: `${result.totalProjects} project${result.totalProjects === 1 ? '' : 's'}`,
        breadcrumbs: data.length > 0
          ? [
              { action: 'Show project', cmd: `feedbackbasket projects show ${data[0]!.id}` },
              { action: 'View feedback', cmd: `feedbackbasket feedback list --project ${data[0]!.id}` },
              { action: 'Create project', cmd: 'feedbackbasket projects create "My Project" --url https://example.com' },
            ]
          : [{ action: 'Create project', cmd: 'feedbackbasket projects create "My Project" --url https://example.com' }],
      });
    });

  // --- projects show ---
  projects
    .command('show <id-or-name>')
    .description('Show project details (accepts ID or name)')
    .action(async (idOrName) => {
      const writer = getWriter();
      const client = requireClient();

      const project = await resolveProject(client, idOrName);

      if (!writer.isMachineOutput()) {
        renderProjectDetail(project);
      }

      writer.ok(project, {
        summary: project.name,
        breadcrumbs: [
          { action: 'View feedback', cmd: `feedbackbasket feedback list --project ${project.id}` },
          { action: 'View bugs', cmd: `feedbackbasket bugs list --project ${project.id}` },
          { action: 'Update project', cmd: `feedbackbasket projects update ${project.id} --name "New Name"` },
        ],
      });
    });

  // --- projects create ---
  projects
    .command('create <name>')
    .description('Create a new project')
    .requiredOption('--url <url>', 'Project URL')
    .option('--description <text>', 'Project description')
    .action(async (name, opts) => {
      const writer = getWriter();
      const client = requireClient();

      const result = await client.createProject({
        name,
        url: opts.url,
        description: opts.description,
      });

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Project created: ${brand.bold(result.project.name)}`);
        console.log(`    ${brand.muted('ID:')} ${result.project.id}`);
        console.log();
      }

      writer.ok(result.project, {
        summary: `Created project "${result.project.name}"`,
        breadcrumbs: [
          { action: 'View project', cmd: `feedbackbasket projects show ${result.project.id}` },
          { action: 'Get widget script', cmd: `feedbackbasket widget script ${result.project.id}` },
          { action: 'List all projects', cmd: 'feedbackbasket projects list' },
        ],
      });
    });

  // --- projects update ---
  projects
    .command('update <id-or-name>')
    .description('Update a project (accepts ID or name)')
    .option('--name <name>', 'New project name')
    .option('--url <url>', 'New project URL')
    .option('--description <text>', 'New project description')
    .action(async (idOrName, opts) => {
      const writer = getWriter();

      if (!opts.name && !opts.url && opts.description === undefined) {
        throw errUsage(
          'At least one of --name, --url, or --description is required',
          'Example: feedbackbasket projects update <id> --name "New Name"',
        );
      }

      const client = requireClient();
      const resolved = await resolveProject(client, idOrName);
      const id = resolved.id;

      const data: Record<string, string> = {};
      if (opts.name) data['name'] = opts.name;
      if (opts.url) data['url'] = opts.url;
      if (opts.description !== undefined) data['description'] = opts.description;

      const updated = await client.updateProject(id, data);

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Project updated: ${brand.bold(updated.name)}`);
        console.log();
      }

      writer.ok(updated, {
        summary: `Updated project "${updated.name}"`,
        breadcrumbs: [
          { action: 'View project', cmd: `feedbackbasket projects show ${id}` },
          { action: 'List all projects', cmd: 'feedbackbasket projects list' },
        ],
      });
    });

  // --- projects delete ---
  projects
    .command('delete <id-or-name>')
    .description('Delete a project (accepts ID or name)')
    .option('--yes', 'Skip confirmation prompt')
    .action(async (idOrName, opts) => {
      const writer = getWriter();
      const client = requireClient();

      const resolved = await resolveProject(client, idOrName);
      const id = resolved.id;
      const projectName = resolved.name;

      // Confirmation (skip in agent mode or --yes)
      if (!opts.yes && !writer.isMachineOutput() && process.stdin.isTTY) {
        console.log(`  ${brand.warning('Warning:')} This will permanently delete project "${brand.bold(projectName)}"`);
        console.log(`  ${brand.muted('All feedback, notes, and settings will be lost.')}`);
        console.log();
        const confirmed = await confirm(`  Delete "${projectName}"?`, false);
        if (!confirmed) {
          console.log(brand.muted('  Cancelled.'));
          return;
        }
      }

      const result = await client.deleteProject(id);

      if (!writer.isMachineOutput()) {
        console.log(`  ${brand.success('✓')} Deleted project "${brand.bold(result.name)}"`);
        console.log();
      }

      writer.ok(result, {
        summary: `Deleted project "${result.name}"`,
        breadcrumbs: [
          { action: 'List remaining projects', cmd: 'feedbackbasket projects list' },
          { action: 'Create new project', cmd: 'feedbackbasket projects create "Name" --url https://...' },
        ],
      });
    });

  return projects;
}

function requireClient(): FeedbackBasketClient {
  const manager = new AuthManager();
  const token = manager.resolveToken();
  if (!token) throw errAuth();
  const config = loadConfig();
  return new FeedbackBasketClient(token, config.baseUrl);
}

function renderProjectsTable(projects: Project[]): void {
  if (projects.length === 0) return;

  const nameW = Math.max(4, ...projects.map(p => p.name.length));
  const header = [
    brand.bold('Name'.padEnd(nameW)),
    brand.bold('ID'.padEnd(26)),
    brand.bold('Total'.padStart(6)),
    brand.bold('Open'.padStart(6)),
    brand.bold('Bugs'.padStart(6)),
  ].join('  ');

  console.log(header);
  console.log(divider(header.length));

  for (const p of projects) {
    const open = p.byStatus['OPEN'] ?? 0;
    const bugs = p.byCategory['BUG'] ?? 0;
    const row = [
      p.name.padEnd(nameW),
      brand.muted(p.id.padEnd(26)),
      String(p.totalFeedback).padStart(6),
      open > 0 ? brand.warning(String(open).padStart(6)) : brand.muted(String(open).padStart(6)),
      bugs > 0 ? brand.error(String(bugs).padStart(6)) : brand.muted(String(bugs).padStart(6)),
    ].join('  ');
    console.log(row);
  }
}

function renderProjectDetail(project: Project): void {
  console.log(brand.bold(project.name));
  console.log(divider(40));
  console.log();
  console.log(`  ${brand.label('ID'.padEnd(14))} ${project.id}`);
  console.log(`  ${brand.label('URL'.padEnd(14))} ${project.url}`);
  if (project.description) {
    console.log(`  ${brand.label('Description'.padEnd(14))} ${project.description}`);
  }
  console.log(`  ${brand.label('Created'.padEnd(14))} ${project.createdAt}`);
  console.log(`  ${brand.label('Feedback'.padEnd(14))} ${project.totalFeedback}`);

  const statusEntries = Object.entries(project.byStatus);
  if (statusEntries.length > 0) {
    console.log();
    console.log(brand.bold('By Status'));
    for (const [status, count] of statusEntries) {
      console.log(`  ${status.padEnd(14)} ${count}`);
    }
  }

  const catEntries = Object.entries(project.byCategory);
  if (catEntries.length > 0) {
    console.log();
    console.log(brand.bold('By Category'));
    for (const [cat, count] of catEntries) {
      console.log(`  ${cat.padEnd(18)} ${count}`);
    }
  }
  console.log();
}
