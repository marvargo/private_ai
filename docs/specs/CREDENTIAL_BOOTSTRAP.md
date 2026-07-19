# Credential handling

Approved providers are Supabase, GitHub, RunPod, and Hugging Face.

Expected environment names are documented without values:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `RUNPOD_API_KEY`
- `HF_TOKEN`

Credentials must never be committed, printed, included in artifacts, or exposed to frontend code. Durable provider operations should use protected GitHub environment secrets or another host-provided secret mechanism. GitHub Actions should prefer the automatic repository token for repository operations. Verification records only whether a required name is available and whether a harmless provider probe succeeds; values must never be retrieved or displayed.