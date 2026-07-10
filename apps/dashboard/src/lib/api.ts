const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface DashboardState {
  sessions: Array<{ id: string; status: string; gpuType?: string; gpuCount: number; autoStopAt?: string; estimatedHourlyCost?: number }>;
  tasks: Array<{ id: string; title: string; status: string; priority: string; riskLevel: string; requiresApproval: boolean }>;
  auditLogs: Array<{ id: string; action: string; status: string; createdAt: string }>;
  costEvents: Array<{ id: string; sessionId?: string; eventType: string; estimatedHourlyCost?: number; createdAt: string }>;
  runtime: { modelId: string; servingEngine: string; status: string; contextLength: number; tensorParallelSize: number; quantization: string };
  modelRegistry: ModelRegistryEntry[];
}

export interface ModelRegistryEntry {
  id: string;
  modelName: string;
  modelFamily: string;
  modelRole: string;
  gpuProfile: string;
  status: string;
  costEstimateHourlyUsd?: number;
  contextLength: number;
  enabled: boolean;
}

export interface GpuTarget {
  id: string;
  found: boolean;
  displayName?: string;
  memoryInGb?: number;
  totalEightGpuVramGb?: number;
  secureCloud: boolean;
  communityCloud: boolean;
  currentlyPricedForEightGpu: boolean;
  eightGpuPrice?: { minimumBidPrice: number | null; uninterruptablePrice: number | null };
}

async function getJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return await res.json() as T;
  } catch {
    return fallback;
  }
}

export async function getDashboardState() {
  return getJson<DashboardState>('/state', { sessions: [], tasks: [], auditLogs: [], runtime: { modelId: 'meta-llama/Meta-Llama-3.1-405B-Instruct', servingEngine: 'vllm', status: 'api_offline', contextLength: 32768, tensorParallelSize: 8, quantization: 'fp8' }, modelRegistry: [], costEvents: [] });
}

export async function getGpuTargets() {
  return getJson<GpuTarget[]>('/runpod/gpu-targets', []);
}
