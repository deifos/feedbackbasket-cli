import { Command } from 'commander';
import { FeedbackBasketClient } from '../client.js';
import { AuthManager } from '../auth/manager.js';
import { loadConfig } from '../config/config.js';
import { errAuth, errUsage } from '../output/errors.js';
import { brand, divider } from '../output/theme.js';
import { resolveProject } from '../resolve.js';
import type { OutputWriter } from '../output/writer.js';

export function createFeedbackExportCommand(getWriter: () => OutputWriter): Command {
  return new Command('export')
    .description('Export feedback to CSV, Markdown, or JSON')
    .argument('[project]', 'Project ID or name')
    .option('--format <format>', 'Export format: csv, md, json', 'csv')
    .action(async (projectArg, opts) => {
      const writer = getWriter();
      const client = requireClient();

      const format = opts.format as 'csv' | 'md' | 'json';
      if (!['csv', 'md', 'json'].includes(format)) {
        throw errUsage('Format must be csv, md, or json', 'Example: feedbackbasket feedback export --format json');
      }

      let projectId: string;
      if (projectArg) {
        const project = await resolveProject(client, projectArg);
        projectId = project.id;
      } else {
        const config = loadConfig();
        if (!config.defaultProject) {
          throw errUsage(
            'Project is required for export.',
            'feedbackbasket feedback export <project> or set a default project',
          );
        }
        projectId = config.defaultProject;
      }

      const data = await client.exportFeedback(projectId, format);

      // Export outputs raw data directly — not wrapped in envelope
      console.log(data);
    });
}

function requireClient(): FeedbackBasketClient {
  const manager = new AuthManager();
  const token = manager.resolveToken();
  if (!token) throw errAuth();
  const config = loadConfig();
  return new FeedbackBasketClient(token, config.baseUrl);
}
