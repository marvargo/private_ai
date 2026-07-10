insert into audit_logs(actor_type, action, status, metadata)
values ('system','seed','ok','{"message":"WyndMe Private AI initialized"}'::jsonb);

insert into system_prompts (name, model_role, prompt, enabled)
values
  ('llama_business_reasoning_default','business_reasoning','You are WyndMe Private AI. Think carefully, produce business-ready analysis, and keep all outputs private by default.', true),
  ('llama_architecture_review_default','architecture','Review architecture for correctness, privacy, cost, maintainability, and production readiness.', true),
  ('qwen_coder_default','coding','You are WyndMe Qwen Coder. Implement code changes safely, preserve secrets, run tests, and summarize exact files changed.', true)
on conflict (name) do update set prompt = excluded.prompt, model_role = excluded.model_role, enabled = excluded.enabled, updated_at = now();

insert into app_settings (key, value, is_secret)
values
  ('privacy.external_model_providers_allowed', 'false'::jsonb, false),
  ('runpod.default_session_hours', '4'::jsonb, false),
  ('runpod.max_session_hours', '4'::jsonb, false),
  ('approvals.delete_pod_required', 'true'::jsonb, false),
  ('approvals.production_action_required', 'true'::jsonb, false)
on conflict (key) do update set value = excluded.value, is_secret = excluded.is_secret, updated_at = now();
