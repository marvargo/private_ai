import { performance } from 'node:perf_hooks';

export interface PrivateModelValidationInput {
  endpointUrl: string;
  apiKey?: string;
  expectedModel?: string;
  prompt?: string;
  stream?: boolean;
  fetch?: typeof fetch;
}

export interface PrivateModelValidationResult {
  ok: boolean;
  endpointUrl: string;
  models: { ok: boolean; status?: number; modelIds: string[]; latencyMs?: number; error?: string };
  chat: { ok: boolean; status?: number; text?: string; latencyMs?: number; error?: string };
  streaming: { ok: boolean; status?: number; supported: boolean; text?: string; latencyMs?: number; error?: string };
  expectedModelFound?: boolean;
}

function authHeaders(apiKey?: string) {
  return apiKey ? { authorization: `Bearer ${apiKey}` } : undefined;
}

function modelIds(payload: any): string[] {
  if (!Array.isArray(payload?.data)) return [];
  return payload.data.map((item: any) => String(item.id ?? item.root ?? item.name ?? '')).filter(Boolean);
}

function completionText(payload: any) {
  return String(payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.text ?? '').trim();
}

export async function validatePrivateModelRuntime(input: PrivateModelValidationInput): Promise<PrivateModelValidationResult> {
  const fetcher = input.fetch ?? fetch;
  const endpointUrl = input.endpointUrl.replace(/\/$/, '');
  const prompt = input.prompt ?? 'Reply with exactly: private model runtime ok';
  const headers = { 'content-type': 'application/json', ...authHeaders(input.apiKey) };
  const result: PrivateModelValidationResult = {
    ok: false,
    endpointUrl,
    models: { ok: false, modelIds: [] },
    chat: { ok: false },
    streaming: { ok: false, supported: false },
  };

  try {
    const started = performance.now();
    const response = await fetcher(`${endpointUrl}/v1/models`, { headers: authHeaders(input.apiKey) });
    const payload = await response.json().catch(() => ({}));
    result.models = { ok: response.ok, status: response.status, modelIds: modelIds(payload), latencyMs: Math.round(performance.now() - started) };
    result.expectedModelFound = input.expectedModel ? result.models.modelIds.some((id) => id.includes(input.expectedModel!)) : undefined;
  } catch (error) {
    result.models = { ok: false, modelIds: [], error: error instanceof Error ? error.message : String(error) };
  }

  const selectedModel = input.expectedModel ?? result.models.modelIds[0] ?? 'private-model';
  try {
    const started = performance.now();
    const response = await fetcher(`${endpointUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: selectedModel, messages: [{ role: 'user', content: prompt }], temperature: 0, max_tokens: 128 }),
    });
    const payload = await response.json().catch(() => ({}));
    const text = completionText(payload);
    result.chat = { ok: response.ok && text.length > 0, status: response.status, text, latencyMs: Math.round(performance.now() - started) };
  } catch (error) {
    result.chat = { ok: false, error: error instanceof Error ? error.message : String(error) };
  }

  if (input.stream) {
    try {
      const started = performance.now();
      const response = await fetcher(`${endpointUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ model: selectedModel, messages: [{ role: 'user', content: prompt }], temperature: 0, max_tokens: 128, stream: true }),
      });
      const text = await response.text();
      result.streaming = { ok: response.ok && text.length > 0, supported: response.ok, status: response.status, text: text.slice(0, 500), latencyMs: Math.round(performance.now() - started) };
    } catch (error) {
      result.streaming = { ok: false, supported: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  result.ok = result.models.ok && result.chat.ok && (!input.stream || result.streaming.ok);
  return result;
}
