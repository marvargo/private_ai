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
