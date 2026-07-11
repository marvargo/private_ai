import { Octokit } from 'octokit';
import { env } from '../utils/env.js';
import { getGitHubToken } from '../services/credentialResolver.js';

export function githubClient() {
  if (!env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');
  return new Octokit({ auth: env.GITHUB_TOKEN });
}

export async function testGitHubToken(octokit = githubClient()) {
  const { data } = await octokit.rest.users.getAuthenticated();
  return { ok: true, login: data.login };
}

export async function listRepos(octokit = githubClient()) {
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({ per_page: 100, sort: 'updated' });
  return data.map((repo) => ({ id: String(repo.id), owner: repo.owner.login, repoName: repo.name, fullName: repo.full_name, private: repo.private, defaultBranch: repo.default_branch }));
}

export async function asyncGitHubClient() {
  try {
    return new Octokit({ auth: await getGitHubToken() });
  } catch {
    return githubClient();
  }
}

export async function testGitHubTokenResolved() {
  return testGitHubToken(await asyncGitHubClient());
}

export async function listReposResolved() {
  return listRepos(await asyncGitHubClient());
}
