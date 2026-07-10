import { env } from '../utils/env.js';
import { RunPodGpuCatalogItem } from '../services/runpodCatalog.js';

const ENDPOINT = 'https://api.runpod.io/graphql';

async function runpodGraphql<T>(query: string, variables: Record<string, unknown> = {}) {
  if (!env.RUNPOD_API_KEY) throw new Error('RUNPOD_API_KEY is required');
  const url = `${ENDPOINT}?api_key=${encodeURIComponent(env.RUNPOD_API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'wyndme-private-ai-api' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`RunPod HTTP ${res.status}`);
  const json = await res.json() as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data as T;
}

export async function testRunPodConnection() {
  const data = await runpodGraphql<{ myself: { id: string; email: string } }>('{ myself { id email } }');
  return { ok: true, account: data.myself };
}

export async function listRunPodGpuTypes() {
  const data = await runpodGraphql<{ gpuTypes: RunPodGpuCatalogItem[] }>('{ gpuTypes { id displayName memoryInGb secureCloud communityCloud lowestPrice(input:{gpuCount:8}) { minimumBidPrice uninterruptablePrice } } }');
  return data.gpuTypes.map((gpu) => ({ ...gpu, eightGpuSupported: gpu.memoryInGb * 8 >= 640, totalEightGpuVramGb: gpu.memoryInGb * 8 }));
}

export async function listRunPodPods() {
  return runpodGraphql('{ myself { pods { id name runtime { uptimeInSeconds ports { ip isIpPublic privatePort publicPort type } } desiredStatus machine { gpuDisplayName gpuCount } } } }');
}

export async function startRunPodPod(podId: string) {
  return runpodGraphql('mutation($podId:String!){ podResume(input:{podId:$podId}) { id desiredStatus } }', { podId });
}

export async function stopRunPodPod(podId: string) {
  return runpodGraphql('mutation($podId:String!){ podStop(input:{podId:$podId}) { id desiredStatus } }', { podId });
}

export async function deleteRunPodPod(podId: string, approved: boolean) {
  if (!approved) throw new Error('Explicit approval required before deleting a RunPod pod');
  return runpodGraphql('mutation($podId:String!){ podTerminate(input:{podId:$podId}) }', { podId });
}
