# Implementation ledger

| Date | Scope | Implementation status | Commit | Notes |
| --- | --- | --- | --- | --- |
| 2026-07-18 | Phase 0 | partial | `e2e2e15` | App errors, redaction, runtime-environment guards, and readiness diagnostics implemented. |
| 2026-07-18 | Phase 1 | partial | `90c3d74` | Production services no longer instantiate local persistence maps; live restart verification remains pending. |
| 2026-07-18 | Phase 2 | partial | `1cc6f1c` | Local RLS helper migration and SQL tests added; live execution requires authenticated SQL capability. |
| 2026-07-18 | Phase 3 | partial | `0157226` | Personal workspace selection and owner project CRUD implemented. |
| 2026-07-19 | Phase 1 | in progress | pending | Removed silent orchestrator persistence fallbacks; production now returns a sanitized persistence failure while explicitly enabled test fallback remains isolated. Moved the legacy orchestration store to the isolated test repository directory; services no longer define process-memory orchestration collections. Remaining repository dependency-injection and persistence coverage still requires work. |
