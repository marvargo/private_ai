# Codex start prompt

Use the following instruction for each Codex run:

> Work only in `marvargo/private_ai`.
>
> Read `docs/specs/MASTER_EXECUTION_PLAN.md` and every linked governing specification. Read `docs/IMPLEMENTATION_LEDGER.md`, `docs/PRODUCTION_VALIDATION_LEDGER.md`, and `docs/BLOCKERS.md`. Resume from the first incomplete implementation item.
>
> Execute the phase specification exactly. Do not create placeholders, static values, mock production behavior, or process-memory persistence. Track implementation and production validation separately. A live validation blocker does not stop code implementation.
>
> After each completed phase or coherent subphase, run the required checks, commit and push to `main`, update the ledgers, and continue to the next incomplete phase. Do not wait for another instruction between phases.
>
> Use Supabase MCP when available; otherwise use the protected operations bridge described in `docs/specs/OPERATIONS_BRIDGE.md`. Do not request provider credentials merely because MCP is unavailable.
>
> Continue until all 23 phases have been attempted or the execution environment ends. Return a consolidated phase-by-phase report with commits, tests, validation evidence, and exact remaining external blockers.