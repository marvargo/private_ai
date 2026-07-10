'use client';

import { createSupabaseBrowserClient } from './supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const BACKEND_SECRET_ENV_NAMES = [
  'RUNPOD_API_KEY',
  'HF_TOKEN',
  'GITHUB_TOKEN',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_ACCESS_TOKEN',
  'ENCRYPTION_KEY',
];

interface AuthenticatedFetchOptions extends RequestInit {
  json?: unknown;
}

interface AuthenticatedApiDependencies {
  fetchImpl?: typeof fetch;
  redirectToLogin?: () => void;
  getAccessToken?: () => Promise<string | undefined>;
}

function redirectToLogin() {
  if (typeof window !== 'undefined') window.location.assign('/login');
}

export function backendSecretEnvNamesForTest() {
  return [...BACKEND_SECRET_ENV_NAMES];
}

export async function authenticatedFetch(path: string, options: AuthenticatedFetchOptions = {}, dependencies: AuthenticatedApiDependencies = {}) {
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const onUnauthenticated = dependencies.redirectToLogin ?? redirectToLogin;
  const token = await (dependencies.getAccessToken ? dependencies.getAccessToken() : createSupabaseBrowserClient().auth.getSession().then(({ data }) => data.session?.access_token));

  if (!token) {
    onUnauthenticated();
    throw new Error('Authentication required');
  }

  const headers = new Headers(options.headers);
  headers.set('authorization', `Bearer ${token}`);
  if (options.json !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json');

  const response = await fetchImpl(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  if (response.status === 401) {
    onUnauthenticated();
    throw new Error('Session expired');
  }

  return response;
}

export async function authenticatedJson<T>(path: string, options: AuthenticatedFetchOptions = {}, dependencies: AuthenticatedApiDependencies = {}): Promise<T> {
  const response = await authenticatedFetch(path, options, dependencies);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return payload as T;
}
