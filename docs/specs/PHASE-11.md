# Phase 11 — Runtime Management

Replace every Runtime Management placeholder with administrator-only working pages and APIs for Overview, Runtimes, Pools, GPU Profiles, Scaling, Costs, Logs, Diagnostics, Approvals, Settings, Validation, and Emergency Stop.

Overview uses real runtime/request/cost metrics. Runtime controls implement start, stop, restart, terminate, drain, logs, diagnostics, and request inspection. Every mutation validates admin role, policy, idempotency key, and correlation ID and writes a sanitized audit event.

UI must show loading, health, active/queued requests, idle and lifetime countdowns, hourly burn, session cost, configuration snapshot, alerts, and operation progress. Add API, provider-adapter, authorization, idempotency, failure-recovery, and Playwright tests.