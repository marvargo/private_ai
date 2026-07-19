# Audit checklist

At the end of each Codex run, inspect:

- No placeholder user or admin routes remain in completed phases.
- No production service uses local durable state.
- Project cards and dashboards use real queries.
- Standalone Personal workspace works.
- Collaboration survives restart.
- RLS and application authorization both exist.
- Encryption is mandatory in production.
- Analytics stores no prompt text.
- Chat streaming is incremental and cancellable.
- Runtime Management controls work.
- Scaling, queues, costs, Coding, Workflows, Integrations, and Studio are functional before their phases are marked complete.
- Required automated tests and live-validation evidence are recorded.

Any failure becomes the next incomplete ledger item.