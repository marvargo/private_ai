import { env } from '../utils/env.js';
import { RunPodGpuCatalogItem } from '../services/runpodCatalog.js';

const ENDPOINT = 'https://api.runpod.io/graphql';

export interface RunPodPodTemplate {
  name: string;
  gpuCount: number;
  gpuType: string;
  volumeGb: number;
  containerImage: string;
  ports: Array<{ containerPort: number; protocol: 'http' | 'tcp' }>;
  env: Record<string, string>;
  volumeMountPath: string;
  startCommand: string;
  healthcheck?: string;
  estimatedHourlyCost?: number;
  modelRole?: 'business_reasoning' | 'research' | 'architecture' | 'coding' | 'qa' | 'database' | 'devops';
}

export interface RunPodPodStatus {
  id: string;
  name?: string;
  desiredStatus?: string;
  runtimeStatus?: string;
  endpointUrl?: string;
  gpuType?: string;
  gpuCount?: number;
  uptimeInSeconds?: number;
}

export async function runpodGraphql<T>(query: string, variables: Record<string, unknown> = {}) {
  if (!env.RUNPOD_API_KEY) throw new Error('RUNPOD_API_KEY is required');
  const url = `${ENDPOINT}?api_key=${encodeURIComponent(env.RUNPOD_API_KEY)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'user-agent': 'wyndme-private-ai-api' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RunPod HTTP ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = await res.json() as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors.map((error) => error.message).join('; '));
  return json.data as T;
}

export function endpointFromPorts(pod: any) {
  const ports = pod?.runtime?.ports ?? [];
  const http = ports.find((port: any) => port.type === 'http' || port.protocol === 'http' || port.privatePort === 8000 || port.privatePort === 8001 || port.privatePort === 8002);
  if (!http) return undefined;
  if (pod?.id && http.privatePort) return `https://${pod.id}-${http.privatePort}.proxy.runpod.net`;
  if (http.ip && http.publicPort) return `https://${http.ip}-${http.publicPort}.proxy.runpod.net`;
  if (http.ip && http.privatePort) return `http://${http.ip}:${http.privatePort}`;
  return undefined;
}

function normalizePod(pod: any): RunPodPodStatus {
  return {
    id: String(pod.id),
    name: pod.name,
    desiredStatus: pod.desiredStatus,
    runtimeStatus: pod.runtime?.uptimeInSeconds ? 'running' : pod.desiredStatus,
    endpointUrl: endpointFromPorts(pod),
    gpuType: pod.machine?.gpuDisplayName,
    gpuCount: pod.machine?.gpuCount,
    uptimeInSeconds: pod.runtime?.uptimeInSeconds,
  };
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
  const data = await runpodGraphql<{ myself: { pods: unknown[] } }>('{ myself { pods { id name runtime { uptimeInSeconds ports { ip isIpPublic privatePort publicPort type } } desiredStatus machine { gpuDisplayName } } } }');
  return data.myself.pods.map(normalizePod);
}

export async function createRunPodPod(template: RunPodPodTemplate) {
  const data = await runpodGraphql<{ podFindAndDeployOnDemand: unknown }>(
    `mutation CreatePod($input: PodFindAndDeployOnDemandInput!) {
      podFindAndDeployOnDemand(input: $input) {
        id name desiredStatus runtime { uptimeInSeconds ports { ip isIpPublic privatePort publicPort type } } machine { gpuDisplayName }
      }
    }`,
    {
      input: {
        name: template.name,
        imageName: template.containerImage,
        cloudType: 'ALL',
        gpuCount: template.gpuCount,
        gpuTypeId: template.gpuType,
        minVcpuCount: 4,
        minMemoryInGb: 16,
        containerDiskInGb: 50,
        volumeInGb: template.volumeGb,
        volumeMountPath: template.volumeMountPath,
        ports: template.ports.map((port) => `${port.containerPort}/${port.protocol}`).join(','),
        env: Object.entries(template.env).map(([key, value]) => ({ key, value })),
        dockerArgs: template.startCommand,
      },
    },
  );
  return normalizePod(data.podFindAndDeployOnDemand);
}

export async function getRunPodPodStatus(podId: string) {
  const pods = await listRunPodPods();
  const pod = pods.find((item) => item.id === podId);
  if (!pod) throw new Error(`RunPod pod ${podId} not found`);
  return pod;
}

export async function getRunPodPodLogs(podId: string) {
  try {
    const data = await runpodGraphql<{ podLogs?: { logs?: string } }>('query PodLogs($podId:String!){ podLogs(podId:$podId) { logs } }', { podId });
    return { supported: true, podId, logs: data.podLogs?.logs ?? '' };
  } catch (error) {
    return { supported: false, podId, logs: '', reason: error instanceof Error ? error.message : String(error) };
  }
}

export async function startRunPodPod(podId: string) {
  const data = await runpodGraphql<{ podResume: unknown }>('mutation($podId:String!){ podResume(input:{podId:$podId}) { id name desiredStatus runtime { uptimeInSeconds ports { ip isIpPublic privatePort publicPort type } } machine { gpuDisplayName } } }', { podId });
  return normalizePod(data.podResume);
}

export async function stopRunPodPod(podId: string) {
  const data = await runpodGraphql<{ podStop: unknown }>('mutation($podId:String!){ podStop(input:{podId:$podId}) { id name desiredStatus runtime { uptimeInSeconds ports { ip isIpPublic privatePort publicPort type } } machine { gpuDisplayName } } }', { podId });
  return normalizePod(data.podStop);
}

export async function deleteRunPodPod(podId: string, approved = false) {
  if (!approved) throw new Error('Explicit approval required before deleting a RunPod pod');
  const data = await runpodGraphql<{ podTerminate: string | boolean }>('mutation($podId:String!){ podTerminate(input:{podId:$podId}) }', { podId });
  return { ok: Boolean(data.podTerminate), podId };
}
