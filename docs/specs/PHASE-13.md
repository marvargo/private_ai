# Phase 13 — Generic autoscaling

Implement a database-driven scaling engine with metrics, operators, thresholds, evaluation windows, required consecutive matches, actions, quantities, cooldowns, priorities, approval modes, cost limits, versions, simulation, decisions, and history.

Supported metrics include active users/requests, queue depth/rate/wait, first-token/completion latency, GPU utilization/memory, KV cache, runtime health/count, hourly cost, and budget remaining. Supported actions include scale up, scale down, hold, request approval, and block.

The evaluator must be generic with no model-specific branching. Use atomic claims/advisory locks, persist the metric snapshot and explanation, honor cooldown/budget/approval constraints, and provide CRUD, reorder, dry-run, version, rollback, and history UI. Add deterministic evaluator, concurrency, approval, cost-limit, and worker tests.