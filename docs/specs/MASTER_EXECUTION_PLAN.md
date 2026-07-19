# Master execution plan

This directory is the durable source of truth for completing the private AI platform.

Codex should read this file first, inspect `docs/IMPLEMENTATION_LEDGER.md`, and resume from the first incomplete phase. Implementation and production validation are tracked separately: a live-provider blocker does not prevent continued code implementation.

## Rules

- Work only in `marvargo/private_ai`.
- Build on the existing architecture.
- Commit and push each completed phase or coherent subphase to `main`.
- Do not count placeholder pages, static values, mock APIs, generic metadata records, or documentation as completed features.
- Production durable state must use Supabase, not process-local maps or silent fallbacks.
- Projects remain optional; Personal workspace must work without a project.
- Regular users must not see internal model, provider, GPU, pod, endpoint, or routing details.
- Raw prompt content must not enter analytics, logs, audits, activity feeds, or administrator dashboards.
- Approved providers are Supabase, GitHub, RunPod, and Hugging Face.
- Supabase MCP is optional; use the operations bridge when MCP is unavailable.

## Phase order

1. [Durable repositories](PHASE-01.md)
2. [SQL helpers, RLS, authorization](PHASE-02.md)
3. [Standalone workspace and optional projects](PHASE-03.md)
4. [Project management](PHASE-04.md)
5. [Memberships, invitations, permissions](PHASE-05.md)
6. [Tasks, initiatives, approvals, collaboration](PHASE-06.md)
7. [Collaborative project dashboard](PHASE-07.md)
8. [Complete chat and true streaming](PHASE-08.md)
9. [Privacy and encryption](PHASE-09.md)
10. [Privacy-safe analytics](PHASE-10.md)
11. [Runtime Management](PHASE-11.md)
12. [Lifecycle and GPU configuration](PHASE-12.md)
13. [Generic autoscaling](PHASE-13.md)
14. [Multi-runtime routing and queues](PHASE-14.md)
15. [Costs, reconciliation, and budgets](PHASE-15.md)
16. [Coding workspace](PHASE-16.md)
17. [Workflows](PHASE-17.md)
18. [Integrations and MCP](PHASE-18.md)
19. [Image Studio](PHASE-19.md)
20. [Video Studio and long-form movies](PHASE-20.md)
21. [Automated validation](PHASE-21.md)
22. [Llama 405B validation](PHASE-22.md)
23. [Deployment and production gates](PHASE-23.md)

Also follow `DEFINITION_OF_DONE.md`, `SECURITY_REQUIREMENTS.md`, `TEST_REQUIREMENTS.md`, `CREDENTIAL_BOOTSTRAP.md`, and `OPERATIONS_BRIDGE.md`.

After each phase, run the applicable migration checks, lint, typecheck, tests, build, browser/security tests, commit, push, update the ledgers, and continue to the next incomplete phase.