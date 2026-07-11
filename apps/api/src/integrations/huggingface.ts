import { env } from '../utils/env.js';
import { getOptionalProviderSecret } from '../services/credentialResolver.js';

export interface HuggingFaceModelAccessResult {
  modelId: string;
  ok: boolean;
  gated?: boolean | 'auto' | 'manual';
  private?: boolean;
  sha?: string;
  siblingCount?: number;
  error?: string;
  status?: number;
}

export async function checkHuggingFaceModelAccess(modelId: string, token?: string): Promise<HuggingFaceModelAccessResult> {
  const resolvedToken = token ?? await getOptionalProviderSecret('huggingface') ?? env.HF_TOKEN;
  if (!resolvedToken) return { modelId, ok: false, error: 'HF_TOKEN is required for model access checks' };
  const res = await fetch(`https://huggingface.co/api/models/${modelId}`, {
    headers: { authorization: `Bearer ${resolvedToken}`, 'user-agent': 'wyndme-private-ai-access-check' },
  });
  if (!res.ok) {
    return { modelId, ok: false, status: res.status, error: `Hugging Face HTTP ${res.status}` };
  }
  const payload = await res.json() as { gated?: boolean | 'auto' | 'manual'; private?: boolean; sha?: string; siblings?: unknown[] };
  return { modelId, ok: true, gated: payload.gated, private: payload.private, sha: payload.sha, siblingCount: payload.siblings?.length ?? 0 };
}

export async function checkRequiredModelAccess(modelIds: string[]) {
  const results = await Promise.all(modelIds.map((modelId) => checkHuggingFaceModelAccess(modelId)));
  return { ok: results.every((result) => result.ok), results };
}
