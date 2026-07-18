# WyndMe Private AI Infrastructure

Production-minded monorepo for a private WyndMe multi-model AI factory targeting Meta Llama 3.1 405B Instruct for reasoning and Qwen Coder for software development on RunPod.

## Status
This repository now contains an initial runnable multi-model scaffold: Next.js dashboard, Fastify API, shared TypeScript package, Supabase migrations, model registry/routing, RunPod templates, and Docker runtime assets for Llama and Qwen Coder. Real RunPod/GitHub/Supabase operations require credentials.

## Run locally
```bash
pnpm install
pnpm api:dev
pnpm dashboard:dev
pnpm test
pnpm typecheck
pnpm build
```

## Required credentials
Copy `.env.example` to `.env` and fill Supabase, RunPod, GitHub, Hugging Face, encryption, and JWT values. Never commit `.env`.

## Hardware target
Llama 3.1 405B reasoning production mode requires a multi-GPU RunPod pod such as 8x H100 80GB, 8x H200, 8x B200, or equivalent capacity with at least 640GB total VRAM and 2TB model cache disk.

## Multi-model strategy

- Llama 3.1 405B: business reasoning, research, product planning, architecture, BRDs/PRDs, market analysis, and final review.
- Qwen Coder: coding, debugging, GitHub repo edits, Supabase migrations, SQL, tests, build fixes, frontend/backend work, and DevOps implementation.
- `model_role=auto` routes tasks deterministically; the dashboard also supports forcing Llama/Qwen roles per task.

## Model access verification

Set `HF_TOKEN` in the backend API environment and call `GET /models/access-check` to verify access to enabled Llama and Qwen models without exposing the token to the dashboard.

## Production readiness

The API now reports production-readiness warnings from `GET /status`, including missing admin API key, missing credential encryption key, missing Supabase configuration, or external-provider privacy drift. See `docs/production-readiness.md`.

## Supabase manual setup

If you only have Supabase URL, anon/publishable key, and service secret key, run `supabase/manual_setup.sql` in the Supabase Dashboard SQL Editor to create the required tables. Then use `GET /supabase/diagnostics` to confirm readiness.


## Final production build

See `docs/FINAL_BUILD_REPORT.md` for the complete operator handoff, setup commands, migration instructions, provider connection steps, hardware requirements, known limitations, and next recommended validation steps.


## Private runtime validation status

The platform includes `infra/scripts/validate-private-model-runtime.sh` and `POST /model/validate` for end-to-end private model validation. Live model validation was not run in the current environment because required backend-only provider credentials were absent. See `docs/model-runtime-validation.md` before any production launch.

## Live validation status (2026-07-10)

- RunPod lifecycle and proxy/platform validation passed with the mock OpenAI-compatible small-test image.
- Real small-test AI inference is still blocked because the public vLLM/TinyLlama pod did not expose healthy `/v1/models` or `/v1/chat/completions`.
- Qwen and Llama 405B have not been started and remain blocked until real small-test inference passes.
- Supabase persistence rows were verified for the latest RunPod validation: ai_sessions, model_runtimes, cost_events, and audit_logs.
- Last known passing GitHub Actions run: https://github.com/marvargo/private_ai/actions/runs/29111838177.

## Current production status

Status category: **blocked**. Production-ready: **no**.

The repository contains the API, dashboard, RunPod orchestration, Supabase migrations, worker, and real small-test runtime image workflow. The real small-test image has been built by GitHub Actions, but live production validation is still blocked until the GHCR image is public/pullable by RunPod and Supabase migrations `004` and `005` are live-applied and verified.

Do not start Qwen or Llama until real small-test inference passes end-to-end.

## Runtime Management

Runtime Management is administrator-only. It provides runtime pools, lifecycle policies, configurable GPU profiles, autoscaling rules, costs, sanitized logs, settings, and emergency controls under `/admin/runtime-management`. Regular users must not see infrastructure details. See `docs/runtime-management.md`.

## White-label product workspace

The regular user workspace exposes product capabilities only: Chat, Studio, Coding, Workflows, Integrations, and Settings. Runtime/model/provider/GPU details remain administrator-only in Runtime Management. Projects are the top-level container for chats, generated media, code, workflows, integrations, and future knowledge bases.
