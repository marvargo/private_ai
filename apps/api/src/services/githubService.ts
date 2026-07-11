import { randomUUID } from 'node:crypto';
import { GitHubRepo } from '@wyndme/shared';
import { githubClient, listReposResolved, testGitHubTokenResolved } from '../integrations/github.js';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { requestApproval } from './approvals.js';
import { writeAudit } from './orchestrator.js';

const connectedRepos = new Map<string, GitHubRepo>();

function id() { return `repo_${randomUUID()}`; }
function stripPrefix(value: string) { return value.replace(/^repo_/, ''); }
function toRecord(row: any): GitHubRepo { return { id: `repo_${row.id}`, providerCredentialId: row.provider_credential_id ?? undefined, owner: row.owner, repoName: row.repo_name, fullName: row.full_name, defaultBranch: row.default_branch ?? undefined, private: Boolean(row.private), connectedAt: row.connected_at }; }
function splitFullName(fullName: string) { const [owner, repo] = fullName.split('/'); if (!owner || !repo) throw new Error('Repository full name must be owner/repo'); return { owner, repo }; }

export async function testGitHubToken() { return testGitHubTokenResolved(); }

export async function listGitHubRepos() { return listReposResolved(); }

export async function connectGitHubRepo(input: { fullName: string; defaultBranch?: string; private?: boolean; providerCredentialId?: string }) {
  const { owner, repo } = splitFullName(input.fullName);
  const local: GitHubRepo = { id: id(), owner, repoName: repo, fullName: input.fullName, defaultBranch: input.defaultBranch, private: input.private ?? true, providerCredentialId: input.providerCredentialId, connectedAt: new Date().toISOString() };
  connectedRepos.set(local.id, local);
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await getSupabaseAdminClient().from('github_repos').insert({ id: stripPrefix(local.id), owner, repo_name: repo, full_name: local.fullName, default_branch: local.defaultBranch, private: local.private, provider_credential_id: local.providerCredentialId }).select('*').single();
      if (error) throw error;
      await writeAudit({ actorType: 'admin', action: 'github.repo_connected', targetType: 'github_repo', targetId: local.fullName, status: 'ok' });
      return toRecord(data);
    } catch {}
  }
  await writeAudit({ actorType: 'admin', action: 'github.repo_connected', targetType: 'github_repo', targetId: local.fullName, status: 'ok' });
  return local;
}

export async function getConnectedRepo(repoId: string) {
  if (connectedRepos.has(repoId)) return connectedRepos.get(repoId)!;
  if (isSupabaseConfigured()) {
    const { data, error } = await getSupabaseAdminClient().from('github_repos').select('*').eq('id', stripPrefix(repoId)).single();
    if (!error && data) return toRecord(data);
  }
  throw new Error(`Connected GitHub repo ${repoId} not found`);
}

export async function readGitHubTree(repoId: string, ref?: string, octokit = githubClient()) {
  const repo = await getConnectedRepo(repoId);
  const { data } = await octokit.rest.git.getTree({ owner: repo.owner, repo: repo.repoName, tree_sha: ref ?? repo.defaultBranch ?? 'main', recursive: 'true' });
  await writeAudit({ actorType: 'admin', action: 'github.tree_read', targetType: 'github_repo', targetId: repo.fullName, status: 'ok' });
  return data.tree.map((item: any) => ({ path: item.path, type: item.type, sha: item.sha, size: item.size }));
}

export async function readGitHubFile(repoId: string, path: string, ref?: string, octokit = githubClient()) {
  const repo = await getConnectedRepo(repoId);
  const { data } = await octokit.rest.repos.getContent({ owner: repo.owner, repo: repo.repoName, path, ref: ref ?? repo.defaultBranch });
  if (Array.isArray(data) || data.type !== 'file') throw new Error(`${path} is not a file`);
  await writeAudit({ actorType: 'admin', action: 'github.file_read', targetType: 'github_file', targetId: `${repo.fullName}/${path}`, status: 'ok' });
  return { path, sha: data.sha, content: Buffer.from(data.content, 'base64').toString('utf8') };
}

export async function createGitHubBranch(repoId: string, branch: string, fromRef?: string, octokit = githubClient()) {
  const repo = await getConnectedRepo(repoId);
  const base = fromRef ?? repo.defaultBranch ?? 'main';
  const { data: ref } = await octokit.rest.git.getRef({ owner: repo.owner, repo: repo.repoName, ref: `heads/${base}` });
  const { data } = await octokit.rest.git.createRef({ owner: repo.owner, repo: repo.repoName, ref: `refs/heads/${branch}`, sha: ref.object.sha });
  await writeAudit({ actorType: 'admin', action: 'github.branch_created', targetType: 'github_repo', targetId: repo.fullName, status: 'ok', metadata: { branch } });
  return data;
}

export async function createOrUpdateGitHubFile(repoId: string, input: { path: string; content: string; branch: string; message: string; sha?: string }, octokit = githubClient()) {
  const repo = await getConnectedRepo(repoId);
  const { data } = await octokit.rest.repos.createOrUpdateFileContents({ owner: repo.owner, repo: repo.repoName, path: input.path, branch: input.branch, message: input.message, content: Buffer.from(input.content).toString('base64'), sha: input.sha });
  await writeAudit({ actorType: 'admin', action: 'github.file_written', targetType: 'github_file', targetId: `${repo.fullName}/${input.path}`, status: 'ok', metadata: { branch: input.branch } });
  return data;
}

export async function openGitHubPullRequest(repoId: string, input: { title: string; body?: string; head: string; base?: string }, octokit = githubClient()) {
  const repo = await getConnectedRepo(repoId);
  const { data } = await octokit.rest.pulls.create({ owner: repo.owner, repo: repo.repoName, title: input.title, body: input.body, head: input.head, base: input.base ?? repo.defaultBranch ?? 'main' });
  await writeAudit({ actorType: 'admin', action: 'github.pull_request_opened', targetType: 'github_pr', targetId: String(data.number), status: 'ok', metadata: { url: data.html_url } });
  return data;
}

export async function listGitHubPullRequests(repoId: string, octokit = githubClient()) {
  const repo = await getConnectedRepo(repoId);
  const { data } = await octokit.rest.pulls.list({ owner: repo.owner, repo: repo.repoName, state: 'open' });
  return data.map((pr: any) => ({ number: pr.number, title: pr.title, url: pr.html_url, head: pr.head.ref, base: pr.base.ref }));
}

export async function readGitHubActionsStatus(repoId: string, ref?: string, octokit = githubClient()) {
  const repo = await getConnectedRepo(repoId);
  const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({ owner: repo.owner, repo: repo.repoName, branch: ref, per_page: 20 });
  return data.workflow_runs.map((run: any) => ({ id: run.id, name: run.name, status: run.status, conclusion: run.conclusion, url: run.html_url }));
}

export async function requireApprovalForDestructiveGitHubAction(action: string, approved = false) {
  if (approved) return { allowed: true };
  const approval = await requestApproval({ approvalType: 'production_action', requestedAction: action, riskLevel: 'critical', requestedBy: 'admin', reason: 'Destructive GitHub actions require approval.' });
  return { allowed: false, approval, reason: 'Approval required' };
}
