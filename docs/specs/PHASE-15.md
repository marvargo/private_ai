# Phase 15 — Costs, reconciliation, and budgets

Implement durable cost events for allocation, loading, healthy, inference, idle, failed start, stop, and deletion. Normalize whether provider price is per GPU or per complete pod; retain raw pricing metadata and prevent double multiplication.

Provide estimates and actual reconciliation by runtime, pool, project, tenant, and permitted user scope. Show hourly burn, session maximum, today, week, month, loading/inference/idle/failed costs, and estimate-versus-actual differences.

Implement global, pool, tenant, project, and optional user budget policies with warning, approval, and hard-limit thresholds, explicit overrides, notifications, and audit history. Launch and scale decisions must check projected cost and remaining budget. Add accounting, reconciliation, boundary, approval, concurrency, and UI tests.