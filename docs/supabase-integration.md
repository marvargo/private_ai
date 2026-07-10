# Supabase integration

## Current project provided

- Project URL: `https://zhcnrxcuyrxnrdqrfcfz.supabase.co`
- Project ID: `zhcnrxcuyrxnrdqrfcfz`

The supplied key was tested ephemerally. It reached the project, but it behaved like a publishable/anon key, not a backend service-role secret:

- `model_registry` returned `PGRST205` because migrations have not been applied yet.
- `/auth/v1/admin/users` returned `401`, which means backend admin/service-role operations are not available with that key.

## New diagnostics endpoint

The API now exposes:

```http
GET /supabase/diagnostics
```

It verifies:

1. Supabase URL/key are configured.
2. Whether the key looks publishable or service-role style.
3. Whether `model_registry` exists and is reachable.
4. Whether Auth admin/service-role operations are available.
5. Specific issues blocking production persistence.

## Required to proceed to durable production state

To apply migrations and persist orchestration state, provide one of:

1. `SUPABASE_DB_URL` with database password so migrations can be applied via SQL/CLI, or
2. a real Supabase service-role secret key plus already-applied migrations, or
3. Supabase access token with project permissions for CLI-driven migration workflows.

Do not expose these values to the dashboard. They belong in the API secret environment only.

## Manual setup without DB URL

If you do not have the database connection string, run `supabase/manual_setup.sql` in the Supabase Dashboard SQL Editor. See `docs/supabase-manual-setup.md`.
