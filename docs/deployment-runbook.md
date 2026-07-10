# Production Deployment Runbook

## Components

- API: deploy `apps/api` as a long-running Node.js service with `NODE_ENV=production`.
- Dashboard: deploy `apps/dashboard` as a Next.js app with only publishable Supabase values in `NEXT_PUBLIC_*` variables.
- Worker: run `pnpm --filter @wyndme/api worker` on a private worker host or scheduled container.
- Supabase: apply SQL files in `supabase/migrations` in order before production traffic.
- RunPod: keep `RUNPOD_API_KEY` only on API/worker hosts.

## Required checks

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Scheduled auto-stop

Run the worker continuously or every few minutes through your scheduler so queued stop tasks and 4-hour session deadlines are enforced.

## Incident shutdown

1. Disable dashboard access in Supabase Auth.
2. Call `POST /runpod/emergency-stop` with an admin JWT.
3. Rotate RunPod, GitHub, Supabase, and Hugging Face tokens.
4. Review `/audit` for actions around the incident window.

## Token rotation

Rotate provider tokens from the provider console, update only backend environment variables, restart API and worker processes, and verify redacted credentials in `/credentials`.
