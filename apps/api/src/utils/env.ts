import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.string().default('development'),
  APP_URL: z.string().default('http://localhost:3000'),
  PORT: z.coerce.number().default(4000),
  ADMIN_API_KEY: z.string().optional(),
  RUNPOD_API_KEY: z.string().optional(),
  RUNPOD_DEFAULT_REGION: z.string().default('US'),
  RUNPOD_DEFAULT_GPU_TYPE: z.string().default('NVIDIA H100 80GB HBM3'),
  RUNPOD_DEFAULT_GPU_COUNT: z.coerce.number().default(8),
  RUNPOD_DEFAULT_VOLUME_GB: z.coerce.number().default(2000),
  HF_TOKEN: z.string().optional(),
  MODEL_ID: z.string().default('meta-llama/Meta-Llama-3.1-405B-Instruct'),
  LLAMA_SERVER_URL: z.string().default('http://localhost:8000'),
  LLAMA_SERVER_API_KEY: z.string().optional(),
  QWEN_SERVER_URL: z.string().optional(),
  QWEN_SERVER_API_KEY: z.string().optional(),
  GITHUB_TOKEN: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_DB_URL: z.string().optional(),
  ENCRYPTION_KEY: z.string().optional(),
  DEFAULT_SESSION_HOURS: z.coerce.number().default(4),
  MAX_SESSION_HOURS: z.coerce.number().default(4),
  MAX_DAILY_GPU_BUDGET_USD: z.coerce.number().optional(),
  AUTO_STOP_ENABLED: z.string().default('true'),
  ALLOW_EXTERNAL_MODEL_PROVIDERS: z.string().default('false'),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  NEXT_PUBLIC_SUPABASE_URL: parsedEnv.NEXT_PUBLIC_SUPABASE_URL || parsedEnv.SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: parsedEnv.SUPABASE_SERVICE_ROLE_KEY || parsedEnv.SUPABASE_SECRET_KEY,
};

export function productionReadinessWarnings() {
  const warnings: string[] = [];
  if (!env.ADMIN_API_KEY) warnings.push('ADMIN_API_KEY is not set; protected routes are open for local development only.');
  if (!env.ENCRYPTION_KEY) warnings.push('ENCRYPTION_KEY is not set; credential vault writes will be blocked.');
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) warnings.push('Supabase URL/service role are not configured; persistent repositories are unavailable.');
  if (env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('sb_publishable_')) warnings.push('SUPABASE_SERVICE_ROLE_KEY appears to be a publishable key; backend persistence and auth admin require a service-role secret.');
  if (env.ALLOW_EXTERNAL_MODEL_PROVIDERS === 'true') warnings.push('External model providers are enabled; private-by-default mode expects this to stay false.');
  return warnings;
}
