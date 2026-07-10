import { Octokit } from 'octokit'; import { env } from '../utils/env.js';
function client(){ if(!env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required'); return new Octokit({auth:env.GITHUB_TOKEN}); }
export async function testGitHubToken(){ const {data}=await client().rest.users.getAuthenticated(); return {ok:true, login:data.login}; }
export async function listRepos(){ const {data}=await client().rest.repos.listForAuthenticatedUser({per_page:100, sort:'updated'}); return data.map(r=>({fullName:r.full_name, private:r.private, defaultBranch:r.default_branch})); }
