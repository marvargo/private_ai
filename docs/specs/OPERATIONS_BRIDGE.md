# Operations bridge

Supabase MCP is optional. Durable provider operations must be available through protected GitHub Actions workflows using the `private-ai-ops` environment.

Required operations:

- provider probe
- Supabase migration manifest
- Supabase migration application
- schema verification
- behavioral RLS tests over Auth/PostgREST
- non-billable RunPod probe
- Hugging Face authentication and gated-model metadata checks
- full validation sequence

Create `.github/workflows/private-ai-operations.yml` and scripts under `scripts/operations/`. Workflow inputs must contain operation names and safe confirmations only, never credentials. Provider secrets are step-scoped. Reports contain status, duration, safe error code, migration name/checksum, workflow URL, and conclusion—never headers, raw bodies, connection strings, or credentials.

Future Codex sessions should first use MCP when available; otherwise dispatch this workflow. Missing MCP must not block implementation. Billable RunPod operations require explicit confirmation and cost-policy approval.