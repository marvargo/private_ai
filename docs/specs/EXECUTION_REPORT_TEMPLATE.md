# Execution report template

For every phase report:

- Implementation status: not started / in progress / code complete / tests complete / passed / failed
- Production validation status: not attempted / passed / blocked / failed
- Files created/changed
- Migration and live status
- APIs and UI routes
- Unit/integration/SQL/Playwright results
- Provider or workflow evidence
- Commit SHA and remote main SHA
- CI result
- Exact remaining external blocker

Never use a single `partial` label to mix completed implementation with blocked production validation.