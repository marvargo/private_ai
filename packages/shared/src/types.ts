import { MODEL_FAMILIES, MODEL_PROVIDERS, MODEL_ROLES, PERMISSION_LEVELS, TOOL_ACTION_CLASSIFICATIONS } from './constants.js';

export type SessionStatus = 'pending'|'starting'|'running'|'stopping'|'stopped'|'failed';
export type TaskStatus = 'queued'|'running'|'waiting_approval'|'completed'|'failed'|'cancelled';
export type RiskLevel = 'low'|'medium'|'high'|'critical';
export type ModelRole = typeof MODEL_ROLES[number];
export type ConcreteModelRole = Exclude<ModelRole, 'auto'>;
export type ModelFamily = typeof MODEL_FAMILIES[number];
export type ModelProvider = typeof MODEL_PROVIDERS[number];
export type PermissionLevel = typeof PERMISSION_LEVELS[number];
export type ToolActionClassification = typeof TOOL_ACTION_CLASSIFICATIONS[number];
export type ServingEngine = 'vllm'|'sglang'|'tensorrt-llm';
export type RuntimeStatus = 'not_configured'|'stopped'|'starting'|'healthy'|'unhealthy'|'failed';
export type UserRole = 'admin'|'operator'|'viewer';
export type ApprovalStatus = 'pending'|'approved'|'rejected';
export type CredentialStatus = 'untested'|'valid'|'invalid'|'disabled';

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  fullName?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderCredential {
  id: string;
  providerName: 'runpod'|'github'|'supabase'|'huggingface'|'llama_runtime'|'qwen_runtime';
  credentialLabel: string;
  encryptedValue?: never;
  redactedValue: string;
  status: CredentialStatus;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
}

export interface ModelRegistryEntry {
  id: string;
  modelName: string;
  modelProvider: ModelProvider;
  modelFamily: ModelFamily;
  modelRole: ConcreteModelRole;
  endpointUrl?: string;
  servingEngine: ServingEngine;
  gpuProvider: 'runpod';
  gpuProfile: string;
  status: RuntimeStatus;
  costEstimateHourlyUsd?: number;
  contextLength: number;
  enabled: boolean;
  servedModelName: string;
  priority: number;
}

export interface AiSession {
  id:string;
  provider:'runpod';
  modelId:string;
  modelRole: ConcreteModelRole;
  status:SessionStatus;
  gpuType?:string;
  gpuCount:number;
  maxHours:number;
  autoStopAt?:string;
  estimatedHourlyCost?:number;
  podId?: string;
  endpointUrl?: string;
}

export interface ModelRuntime {
  id: string;
  sessionId?: string;
  modelRegistryId?: string;
  modelId: string;
  modelRole?: ConcreteModelRole;
  servingEngine: ServingEngine;
  status: RuntimeStatus;
  healthUrl?: string;
  apiBaseUrl?: string;
  contextLength: number;
  quantization?: string;
  tensorParallelSize: number;
  pipelineParallelSize: number;
  lastHealthCheckAt?: string;
}

export interface AiTask {
  id:string;
  title:string;
  description:string;
  taskType:string;
  modelRole: ModelRole;
  resolvedModelRole: ConcreteModelRole;
  assignedModelId:string;
  assignedModelName:string;
  status:TaskStatus;
  priority:'low'|'normal'|'high'|'urgent';
  riskLevel:RiskLevel;
  allowedTools:string[];
  requiresApproval:boolean;
}

export interface AiTaskLog {
  id: string;
  taskId: string;
  sessionId?: string;
  level: 'debug'|'info'|'warn'|'error';
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface GitHubRepo {
  id: string;
  providerCredentialId?: string;
  owner: string;
  repoName: string;
  fullName: string;
  defaultBranch?: string;
  private: boolean;
  connectedAt: string;
}

export interface SupabaseProject {
  id: string;
  providerCredentialId?: string;
  organizationId?: string;
  projectRef: string;
  projectName?: string;
  region?: string;
  status?: string;
  connectedAt: string;
}

export interface Approval {
  id: string;
  taskId?: string;
  approvalType: 'runpod_start'|'runpod_delete'|'credential_delete'|'production_action';
  requestedAction: string;
  riskLevel: RiskLevel;
  status: ApprovalStatus;
  requestedBy?: string;
  approvedBy?: string;
  rejectedBy?: string;
  reason?: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  actorType: 'system'|'admin'|'worker'|'user';
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  status: 'ok'|'blocked'|'failed';
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CostEvent {
  id: string;
  sessionId?: string;
  provider: 'runpod';
  resourceType?: string;
  gpuType?: string;
  gpuCount?: number;
  estimatedHourlyCost?: number;
  estimatedTotalCost?: number;
  eventType: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  modelRole: ModelRole;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'system'|'user'|'assistant'|'tool';
  content: string;
  modelName?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  sourceType: 'manual'|'github'|'supabase'|'upload';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SystemPrompt {
  id: string;
  name: string;
  modelRole: ModelRole;
  prompt: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppSetting {
  key: string;
  value: unknown;
  isSecret: boolean;
  updatedAt: string;
}

export interface ToolPolicy {
  permissionLevel: PermissionLevel;
  classification: ToolActionClassification;
  requiresApproval: boolean;
  requiresCostCheck: boolean;
}

export interface FeasibilityInput { gpuCount:number; gpuModel:string; totalVramGb:number; diskGb:number; cudaAvailable:boolean; dockerAvailable:boolean; hfTokenPresent:boolean; modelPathAvailable:boolean; servingEngine:ServingEngine; }
export interface FeasibilityResult { ok:boolean; missing:string[]; warnings:string[]; recommendedTestMode?:'70b'; }
