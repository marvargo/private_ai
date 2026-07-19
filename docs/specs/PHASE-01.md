# Phase 01 — Durable repositories

Replace production process-memory persistence with typed Supabase repositories for projects, conversations, messages, members, invitations, activities, initiatives, favorites, workspace records, approvals, runtime state, queues, scaling decisions, and costs.

Required:

- Repository interfaces plus Supabase implementations under `apps/api/src/repositories/`.
- Test-only in-memory implementations under a clearly isolated test directory.
- Production factory must reject in-memory mode.
- Database errors become sanitized `AppError` responses; never silently return local state.
- Multi-record changes use SQL RPCs or transactions.
- Services receive repositories through dependency injection.
- Add static checks preventing production imports of test repositories.
- Add persistence/restart integration tests and database-failure tests.
- Remove remaining production `Map`/`Set` state.

Done only when all affected APIs persist across process restart and the required quality commands pass.