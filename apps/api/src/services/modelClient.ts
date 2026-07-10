import { ModelRole } from '@wyndme/shared';
import { env } from '../utils/env.js';
import { selectModelForTask } from './modelRegistry.js';

export async function chatWithPrivateModel(
  messages: Array<{role:string; content:string}>,
  options: {temperature?:number; max_tokens?:number; modelRole?: ModelRole; taskType?: string} = {},
) {
  const selection = selectModelForTask(options.taskType ?? 'business_strategy', options.modelRole ?? 'auto');
  const baseUrl = selection.model.endpointUrl || (selection.model.modelFamily === 'qwen' ? process.env.QWEN_SERVER_URL : env.LLAMA_SERVER_URL);
  if (!baseUrl) throw new Error(`No private endpoint configured for ${selection.model.modelFamily} model ${selection.model.id}`);
  const apiKey = selection.model.modelFamily === 'qwen' ? process.env.QWEN_SERVER_API_KEY : env.LLAMA_SERVER_API_KEY;
  const res = await fetch(`${baseUrl.replace(/\/$/,'')}/v1/chat/completions`, {
    method: 'POST',
    headers: {'content-type':'application/json', ...(apiKey ? {authorization:`Bearer ${apiKey}`} : {})},
    body: JSON.stringify({model: selection.model.servedModelName, messages, temperature: options.temperature ?? 0.2, max_tokens: options.max_tokens ?? 1024}),
  });
  if (!res.ok) throw new Error(`Private ${selection.model.modelFamily} model HTTP ${res.status}`);
  const payload = await res.json();
  return { modelRouting: { requestedRole: selection.requestedRole, resolvedRole: selection.resolvedModelRole, modelId: selection.model.id, modelName: selection.model.modelName }, ...payload };
}
