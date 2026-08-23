import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveProject } from '../src/resolve.js';
import type { FeedbackBasketClient } from '../src/client.js';
import type { Project } from '../src/types.js';

const projects = [
  { id: 'project-one', name: 'Alpha', url: 'https://alpha.test' },
  { id: 'project-two', name: 'Beta Product', url: 'https://beta.test' },
] as Project[];

function client(): FeedbackBasketClient {
  return {
    listProjects: async () => ({ projects, totalProjects: projects.length }),
    getProject: async (id: string) => ({ ...projects[0]!, id }),
  } as FeedbackBasketClient;
}

test('project resolution supports IDs and unambiguous names', async () => {
  assert.equal((await resolveProject(client(), 'Alpha')).id, 'project-one');
  assert.equal((await resolveProject(client(), 'beta')).id, 'project-two');
  assert.equal((await resolveProject(client(), 'c12345678901234567890')).id, 'c12345678901234567890');
});
