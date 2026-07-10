# Supabase manual setup without DB URL

You already provided the API keys the app needs:

- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWKS_URL`

Those keys let the app talk to Supabase, but they do not create database tables by themselves. To create tables without a DB URL, use the Supabase Dashboard SQL Editor.

## Steps

1. Open Supabase Dashboard.
2. Select project `zhcnrxcuyrxnrdqrfcfz`.
3. Open **SQL Editor**.
4. Copy the full contents of `supabase/manual_setup.sql`.
5. Paste into a new SQL query.
6. Click **Run**.
7. Start the API with the supplied Supabase env vars.
8. Visit `GET /supabase/diagnostics`.

Expected after setup:

- `modelRegistryTableReady: true`
- `authAdminAvailable: true`
- no issue about missing `model_registry`

## Why this is needed

The secret key can read/write data and perform Auth admin actions, but it cannot run arbitrary SQL migrations through the REST API. The SQL Editor runs the database setup directly inside Supabase.
