import { createRemoteJWKSet, jwtVerify } from 'jose';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { getSupabaseAdminClient, isSupabaseConfigured } from '../repositories/supabaseClient.js';
import { env } from '../utils/env.js';

const PUBLIC_ROUTES = new Set(['/health']);

type HeaderValue = string | string[] | undefined;

export interface AdminIdentity {
  userId: string;
  email?: string;
  role: 'admin';
}

interface VerifiedJwt {
  sub: string;
  email?: string;
}

interface AuthContext {
  path: string;
  authorization?: HeaderValue;
  adminApiKeyHeader?: HeaderValue;
  nodeEnv?: string;
  adminApiKey?: string;
  supabaseConfigured?: boolean;
}

interface AuthDependencies {
  verifyJwt?: (token: string) => Promise<VerifiedJwt>;
  findUserRole?: (userId: string) => Promise<{ role: string; email?: string } | undefined>;
}

export type AdminAuthResult =
  | { allowed: true; identity?: AdminIdentity; usedFallbackAdminApiKey?: boolean }
  | { allowed: false; statusCode: 401 | 403 | 503; error: string };

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

function firstHeader(value: HeaderValue) {
  return Array.isArray(value) ? value[0] : value;
}

function bearerToken(authorization: HeaderValue) {
  const value = firstHeader(authorization);
  if (!value?.startsWith('Bearer ')) return undefined;
  return value.slice('Bearer '.length).trim();
}

function supabaseJwksUrl() {
  const configured = env.SUPABASE_JWKS_URL || (env.NEXT_PUBLIC_SUPABASE_URL ? `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/auth/v1/.well-known/jwks.json` : undefined);
  if (!configured) throw new Error('SUPABASE_JWKS_URL or NEXT_PUBLIC_SUPABASE_URL is required for JWT validation');
  return configured;
}

export async function verifySupabaseJwt(token: string): Promise<VerifiedJwt> {
  jwks ??= createRemoteJWKSet(new URL(supabaseJwksUrl()));
  const { payload } = await jwtVerify(token, jwks, { issuer: env.NEXT_PUBLIC_SUPABASE_URL ? `${env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '')}/auth/v1` : undefined });
  if (!payload.sub) throw new Error('Supabase JWT is missing sub');
  return { sub: payload.sub, email: typeof payload.email === 'string' ? payload.email : undefined };
}

export async function findAdminProfile(userId: string) {
  const { data, error } = await getSupabaseAdminClient()
    .from('users_profile')
    .select('role,email')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return { role: String(data.role), email: typeof data.email === 'string' ? data.email : undefined };
}

export async function authenticateAdmin(context: AuthContext, dependencies: AuthDependencies = {}): Promise<AdminAuthResult> {
  if (PUBLIC_ROUTES.has(context.path)) return { allowed: true };

  const nodeEnv = context.nodeEnv ?? env.NODE_ENV;
  const adminApiKey = context.adminApiKey ?? env.ADMIN_API_KEY;
  const suppliedApiKey = firstHeader(context.adminApiKeyHeader);
  if (nodeEnv !== 'production' && adminApiKey && suppliedApiKey === adminApiKey) {
    return { allowed: true, usedFallbackAdminApiKey: true };
  }

  const token = bearerToken(context.authorization);
  if (!token) return { allowed: false, statusCode: 401, error: 'Supabase admin JWT required' };

  const supabaseConfigured = context.supabaseConfigured ?? isSupabaseConfigured();
  if (!supabaseConfigured) return { allowed: false, statusCode: 503, error: 'Supabase auth is not configured' };

  try {
    const verified = await (dependencies.verifyJwt ?? verifySupabaseJwt)(token);
    const profile = await (dependencies.findUserRole ?? findAdminProfile)(verified.sub);
    if (profile?.role !== 'admin') return { allowed: false, statusCode: 403, error: 'Admin role required' };
    return { allowed: true, identity: { userId: verified.sub, email: profile.email ?? verified.email, role: 'admin' } };
  } catch {
    return { allowed: false, statusCode: 401, error: 'Invalid Supabase admin JWT' };
  }
}

export async function registerAdminAuth(app: FastifyInstance) {
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await authenticateAdmin({
      path: request.url.split('?')[0],
      authorization: request.headers.authorization,
      adminApiKeyHeader: request.headers['x-admin-api-key'],
    });

    if (!result.allowed) {
      await reply.code(result.statusCode).send({ ok: false, error: result.error });
      return;
    }

    if (result.identity) {
      request.adminUser = result.identity;
    }
  });
}

declare module 'fastify' {
  interface FastifyRequest {
    adminUser?: AdminIdentity;
  }
}
