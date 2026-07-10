# Deployment

Dashboard can deploy to Vercel or any Next.js host. API can deploy to a private server, Railway, Render, or Fly.io. Supabase hosts auth and Postgres state. RunPod hosts only the private model runtime.

1. Apply `supabase/migrations/001_initial_schema.sql`.
2. Set environment variables from `.env.example`.
3. Deploy `apps/api` with private credentials.
4. Deploy `apps/dashboard` with only public Supabase URL/anon key and API URL.
5. Build/push `infra/docker/llama405b` image for RunPod.
