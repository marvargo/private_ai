# Definition of Done

A phase is complete only when all applicable items pass:

- Durable Supabase schema and migration exist.
- Repository layer performs real persistence and surfaces database failures.
- Service and route implement the real operation.
- Server-side authorization and RLS are enforced.
- Typed request/response contracts exist in shared code.
- User or admin UI is functional; every visible control has a handler.
- Success, validation, authorization, conflict, retry, and failure states are handled.
- Unit and integration tests cover success and failure.
- Playwright covers primary user workflows.
- No production `Map`, `Set`, placeholder, static health/count, empty mock response, or fake streaming remains.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.
- Work is committed and pushed; ledger contains commit and evidence.

Production validation is reported separately. A live-provider blocker does not lower completed implementation to a scaffold, but production-ready may not be claimed until live gates pass.