# External blockers

## Supabase live SQL execution

- **MCP:** This task has no Supabase MCP SQL executor registered.
- **Management API:** The HTTPS database-query probe is rejected with safe error `1010` (HTTP 403).
- **TCP:** PostgreSQL direct and pooler connectivity are unavailable by environment network policy; this is not retried as an alternative migration path.

## Consequence

Live migration history, RLS catalog checks, and behavioral RLS tests cannot be asserted until an authenticated HTTPS SQL/MCP capability is available. Local migration files and implementation work can continue independently.
