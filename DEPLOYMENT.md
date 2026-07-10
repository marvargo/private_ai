# Deployment

Dashboard can deploy to Vercel or any Next.js host. API can deploy to a private server, Railway, Render, or Fly.io. Supabase hosts auth and Postgres state. RunPod hosts only the private model runtime.

1. Apply `supabase/migrations/001_initial_schema.sql`.
2. Set environment variables from `.env.example`.
3. Deploy `apps/api` with private credentials.
4. Deploy `apps/dashboard` with only public Supabase URL/anon key and API URL.
5. Build/push `infra/docker/llama405b` image for RunPod.


## Production CI/CD

GitHub Actions CI is defined in `.github/workflows/ci.yml` and runs install, lint, typecheck, tests, build, a lightweight secret scan, and a migration presence check on pushes and pull requests targeting `main`.

See `docs/deployment-runbook.md` for API, dashboard, worker, Supabase, RunPod, scheduled auto-stop, incident shutdown, and token rotation procedures.


## Final handoff

The final deployment and operations checklist is maintained in `docs/FINAL_BUILD_REPORT.md`.
