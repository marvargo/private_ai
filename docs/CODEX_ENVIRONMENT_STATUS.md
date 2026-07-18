# Codex environment status

_Last validated: 2026-07-18 UTC_

## Execution surface

- Surface: Linux hosted Codex task.
- Persistent repository secret store API: unavailable to this task.
- Operating-system keyring: unavailable.
- Persistent home-directory storage: available to child-process verification only.
- Repository credential storage: prohibited and not used.

## Credential bootstrap

The following variables are stored outside the repository in a mode-restricted local Codex environment file. This is the strongest available storage backend in this task; it must not be interpreted as a managed cloud secret store.

| Variable | Configured | Storage backend | Child-process persistence test |
| --- | --- | --- | --- |
| `SUPABASE_PUBLISHABLE_KEY` | yes | local Codex environment file | passed |
| `SUPABASE_SECRET_KEY` | yes | local Codex environment file | passed |
| `SUPABASE_JWKS_URL` | yes | local Codex environment file | passed |
| `RUNPOD_API_KEY` | yes | local Codex environment file | passed |
| `HF_TOKEN` | yes | local Codex environment file | passed |
| `Github_token` | no | no NAME=VALUE credential supplied in this bootstrap block | not applicable |
| `SUPABASE_PROJECT_REF` | no | no NAME=VALUE credential supplied in this bootstrap block | not applicable |
| `SUPABASE_MCP_ACCESS_TOKEN` | no | no NAME=VALUE credential supplied in this bootstrap block | not applicable |

## MCP status

- Persistent MCP-registration tool: unavailable in this task.
- Registered Supabase MCP server: none detected.
- SQL execution, migration application, schema inspection, `pg_policies` inspection, and `pg_proc` inspection through MCP: unavailable.
- Management API database-query probe: denied by the remote service (HTTP 403, safe error `1010`).

## Handling rules

- This document contains no secret values.
- The local credential file is outside the repository, has file mode `0600`, and is not committed.
- A future session must independently confirm that the host home directory remains attached before treating local-file credentials as available.
