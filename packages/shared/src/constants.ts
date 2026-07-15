export const LLAMA_REASONING_MODEL_ID = 'meta-llama/Meta-Llama-3.1-405B-Instruct';
export const QWEN_CODER_MODEL_ID = 'Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8';
export const LLAMA_SERVED_MODEL_NAME = 'wyndme-llama-405b';
export const QWEN_SERVED_MODEL_NAME = 'wyndme-qwen-coder';

// Backward-compatible aliases while the product transitions from one model to the multi-model registry.
export const PRIMARY_MODEL_ID = LLAMA_REASONING_MODEL_ID;
export const SERVED_MODEL_NAME = LLAMA_SERVED_MODEL_NAME;

export const DEFAULT_MAX_SESSION_HOURS = 4;
export const REQUIRED_405B_GPU_COUNT = 8;
export const REQUIRED_405B_MIN_VRAM_GB = 640;

export const MODEL_ROLES = ['business_reasoning', 'research', 'architecture', 'coding', 'qa', 'database', 'devops', 'auto'] as const;
export const MODEL_FAMILIES = ['llama', 'qwen', 'test', 'future'] as const;
export const MODEL_PROVIDERS = ['runpod', 'local', 'future'] as const;

export const TOOL_PERMISSIONS = ['chat_only','read_github','write_github_branch','create_pull_request','read_supabase','draft_supabase_migration','runpod_start_stop','browser_research','document_generation'] as const;

export const TASK_TYPE_MODEL_ROLE_DEFAULTS: Record<string, typeof MODEL_ROLES[number]> = {
  business_strategy: 'business_reasoning',
  brd_generation: 'business_reasoning',
  prd_generation: 'business_reasoning',
  product_requirements: 'business_reasoning',
  market_research: 'research',
  competitive_analysis: 'research',
  product_architecture: 'architecture',
  architecture_review: 'architecture',
  final_review: 'architecture',
  code_generation: 'coding',
  debugging: 'coding',
  github_repo_change: 'coding',
  app_development: 'coding',
  supabase_migration: 'database',
  sql_generation: 'database',
  test_creation: 'qa',
  build_error: 'qa',
  deployment_script: 'devops',
  devops_implementation: 'devops',
};

export const PERMISSION_LEVELS = ['chat_only','read_tools','development_write','infrastructure_operations','production_gated'] as const;
export const TOOL_ACTION_CLASSIFICATIONS = ['chat_only','safe_read','safe_development_write','cost_impacting_action','sensitive_data_action','production_action','destructive_action','external_sharing_action'] as const;
