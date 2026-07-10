# Architecture

Browser dashboard -> Fastify backend API -> Supabase Postgres/Auth -> RunPod API -> RunPod GPU pod -> vLLM OpenAI-compatible Llama 405B endpoint.

The current implementation includes API routes for state, sessions, tasks, audit logs, RunPod GPU catalog verification, RunPod pod start/stop, GitHub repo listing, and private model chat. Provider secrets remain backend-only. The next iteration should replace the in-process orchestrator store with Supabase-backed repositories and RLS-aware access checks.
