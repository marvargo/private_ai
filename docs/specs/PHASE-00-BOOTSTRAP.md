# Phase 00 — Operations and credential bootstrap

This phase establishes the durable operations path before the remaining implementation.

Required outcomes:

- Provider credentials are available only through protected host/GitHub secret mechanisms and never committed.
- GitHub Environment `private-ai-ops` is the authoritative operations environment when available.
- `.github/workflows/private-ai-operations.yml` supports provider probes, Supabase migration/verification/RLS tests, and safe validation reports.
- Supabase MCP is optional; missing MCP never blocks implementation.
- Harmless probes verify Supabase, RunPod, and Hugging Face authentication without creating billable resources.
- `docs/CODEX_ENVIRONMENT_STATUS.md`, implementation ledger, production-validation ledger, and blocker log remain sanitized.

No credential value may appear in source, logs, artifacts, issues, documentation, or frontend output.