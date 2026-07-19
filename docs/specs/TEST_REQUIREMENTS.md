# Test requirements

Every phase must add tests at the appropriate layers.

## Required commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- `pnpm playwright test` for affected UI flows
- SQL/RLS tests for database authorization
- worker/runtime tests for lifecycle, queues, scaling, and costs
- secret-leak and white-label response tests

## Minimum scenarios

Test valid use, invalid input, unauthenticated, unauthorized, cross-project access, database failure, retry/idempotency, empty state, concurrent update, and recovery after restart. UI tests must click every primary control and verify persisted results. Streaming tests must verify multiple chunks, cancellation, disconnect, incomplete state, and single final persistence. Provider tests must avoid billable operations unless approval is explicitly present.