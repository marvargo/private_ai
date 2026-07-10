# Security

- Secrets are backend-only and must be stored encrypted at rest.
- Frontend must never receive RunPod, GitHub, Supabase service-role, Hugging Face, or model API keys.
- External model providers are disabled by default with `ALLOW_EXTERNAL_MODEL_PROVIDERS=false`.
- RunPod deletes and other destructive actions require explicit approval.
- GPU sessions default to a four-hour maximum with emergency stop and audit logging.
