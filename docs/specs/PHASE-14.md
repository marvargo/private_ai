# Phase 14 — Multi-runtime routing and queues

Implement runtime pools with multiple replicas, durable request queues, capacity tracking, atomic assignment, load balancing, active-stream tracking, draining, cancellation, startup waiting, and safe scale-down.

Selection excludes loading, unhealthy, stopping, draining, and capacity-full runtimes. Score healthy candidates by active requests, queue, latency, utilization, and optional affinity. Create assignment and increment counters atomically; decrement in `finally` and persist request events.

When no runtime is ready, queue the request, start capacity only when policy/budget allows, and return user-safe loading/queue status without infrastructure details. Never create one pod per user. Add concurrency, race, cancellation, drain, restart, queue-order, recovery, and load-distribution tests.