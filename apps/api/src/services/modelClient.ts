import { ModelRole } from '@wyndme/shared';
import { env } from '../utils/env.js';
import { assertModelRuntimeHealthy } from './modelRuntimeHealth.js';
import { getOptionalLlamaRuntimeApiKey, getOptionalQwenRuntimeApiKey } from './credentialResolver.js';

function privateEndpointForFamily(modelFamily: string, endpointUrl?: string) {
  if (endpointUrl) return endpointUrl;
  if (modelFamily === 'qwen') return process.env.QWEN_SERVER_URL;
  if (modelFamily === 'test') return process.env.TEST_MODEL_SERVER_URL;
  return env.LLAMA_SERVER_URL;
}

async function privateApiKeyForFamily(modelFamily: string) {
  if (modelFamily === 'qwen') return getOptionalQwenRuntimeApiKey();
  if (modelFamily === 'test') return process.env.TEST_MODEL_SERVER_API_KEY;
  return getOptionalLlamaRuntimeApiKey();
}

export async function chatWithPrivateModel(
  messages: Array<{role:string; content:string}>,
  options: {temperature?:number; max_tokens?:number; modelRole?: ModelRole; taskType?: string; fetch?: typeof fetch; systemPrompt?: string} = {},
) {
  const selection = assertModelRuntimeHealthy(options.taskType ?? 'business_strategy', options.modelRole ?? 'auto');
  const baseUrl = privateEndpointForFamily(selection.model.modelFamily, selection.model.endpointUrl);
  if (!baseUrl) throw new Error(`No private endpoint configured for ${selection.model.modelFamily} model ${selection.model.id}`);
  if (env.ALLOW_EXTERNAL_MODEL_PROVIDERS !== 'true' && /(^|\.)((openai|anthropic|googleapis|generativelanguage|gemini)\.com|api\.meta\.ai)$/i.test(new URL(baseUrl).hostname)) throw new Error('External model providers are disabled by default; configure a private OpenAI-compatible endpoint.');
  const apiKey = await privateApiKeyForFamily(selection.model.modelFamily);
  const requestMessages = options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }, ...messages] : messages;
  const fetcher = options.fetch ?? fetch;
  const res = await fetcher(`${baseUrl.replace(/\/$/,'')}/v1/chat/completions`, {
    method: 'POST',
    headers: {'content-type':'application/json', ...(apiKey ? {authorization:`Bearer ${apiKey}`} : {})},
    body: JSON.stringify({model: selection.model.servedModelName, messages: requestMessages, temperature: options.temperature ?? 0.2, max_tokens: options.max_tokens ?? 1024}),
  });
  if (!res.ok) throw new Error(`Private ${selection.model.modelFamily} model HTTP ${res.status}`);
  const payload = await res.json();
  return { modelRouting: { requestedRole: selection.requestedRole, resolvedRole: selection.resolvedModelRole, modelId: selection.model.id, modelName: selection.model.modelName }, ...payload };
}
