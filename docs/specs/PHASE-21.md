# Phase 21 — Automated validation

Implement and run complete automated validation across database, API, worker, UI, privacy, security, and provider boundaries.

Required suites: unit, integration, SQL migration, RLS behavior, authorization matrix, conversation privacy, secret-leak, white-label response, runtime lifecycle, autoscaling, queue/load-balancing, cost accounting, project collaboration, chat streaming, Coding, Workflows, Integrations, Studio, and Playwright.

Playwright must exercise every primary visible control for regular user, owner, collaborator, viewer, and administrator. Verify regular-user HTML and network payloads contain no internal model/provider/GPU/runtime identifiers. Verify administrators cannot retrieve private prompt content through admin APIs. Produce machine-readable reports and update both ledgers with commands, conclusions, workflow URLs, and remaining failures.