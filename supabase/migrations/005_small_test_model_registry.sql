create unique index if not exists model_registry_family_role_name_idx
on public.model_registry (model_family, model_role, served_model_name);

insert into public.model_registry (
  model_name,
  model_provider,
  model_family,
  model_role,
  serving_engine,
  gpu_provider,
  gpu_profile,
  status,
  cost_estimate_hourly_usd,
  context_length,
  enabled,
  served_model_name,
  priority
)
values (
  'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
  'runpod',
  'test',
  'qa',
  'vllm',
  'runpod',
  '1xH100-or-compatible-small-test',
  'not_configured',
  0.5,
  4096,
  true,
  'wyndme-small-test-real',
  1
)
on conflict (model_family, model_role, served_model_name) do update
set
  model_name = excluded.model_name,
  gpu_profile = excluded.gpu_profile,
  cost_estimate_hourly_usd = excluded.cost_estimate_hourly_usd,
  context_length = excluded.context_length,
  enabled = true,
  priority = excluded.priority,
  updated_at = now();
