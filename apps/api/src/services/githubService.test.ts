import { describe, expect, it } from 'vitest';
import { connectGitHubRepo, createGitHubBranch, createOrUpdateGitHubFile, readGitHubFile, readGitHubTree, requireApprovalForDestructiveGitHubAction } from './githubService.js';

function mockOctokit() {
  return {
    rest: {
      git: {
        getTree: async () => ({ data: { tree: [{ path: 'README.md', type: 'blob', sha: 'sha', size: 10 }] } }),
        getRef: async () => ({ data: { object: { sha: 'base-sha' } } }),
        createRef: async (_input: any) => ({ data: { ref: _input.ref, object: { sha: _input.sha } } }),
      },
      repos: {
        getContent: async () => ({ data: { type: 'file', sha: 'file-sha', content: Buffer.from('hello').toString('base64') } }),
        createOrUpdateFileContents: async (_input: any) => ({ data: { content: { path: _input.path }, commit: { sha: 'commit-sha' } } }),
      },
    },
  } as any;
}

describe('github service', () => {
  it('connects repos and reads tree/file', async () => {
    const repo = await connectGitHubRepo({ fullName: 'marvargo/private_ai', defaultBranch: 'main', private: true });
    await expect(readGitHubTree(repo.id, undefined, mockOctokit())).resolves.toEqual([{ path: 'README.md', type: 'blob', sha: 'sha', size: 10 }]);
    await expect(readGitHubFile(repo.id, 'README.md', undefined, mockOctokit())).resolves.toMatchObject({ content: 'hello' });
  });

  it('creates branches and writes files on branches', async () => {
    const repo = await connectGitHubRepo({ fullName: 'marvargo/private_ai', defaultBranch: 'main', private: true });
    await expect(createGitHubBranch(repo.id, 'feature/test', undefined, mockOctokit())).resolves.toMatchObject({ ref: 'refs/heads/feature/test' });
    await expect(createOrUpdateGitHubFile(repo.id, { path: 'docs/test.md', content: 'ok', branch: 'feature/test', message: 'test' }, mockOctokit())).resolves.toMatchObject({ commit: { sha: 'commit-sha' } });
  });

  it('requires approval for destructive GitHub actions', async () => {
    const decision = await requireApprovalForDestructiveGitHubAction('delete branch');
    expect(decision.allowed).toBe(false);
    expect(decision.approval?.status).toBe('pending');
  });
});
