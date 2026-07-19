# Phase 16 — Coding workspace

Implement real coding projects for Personal or project context. Persist repositories, files, versions, jobs, logs, diffs, test/build results, previews, commits, deployments, and secret references.

Required UI: project creation/import, GitHub repository connection, file tree, editor, diff viewer, job panel, lint/typecheck/test/build output, preview, change history, commit form, and deployment hooks. Use a safe workspace filesystem and explicit allowlists; never expose provider/model names or secret values.

Coding jobs must support planning, execution, cancellation, retry, patch review, apply/reject, and immutable history. GitHub writes require server-side permission checks and exact repository scope. Add repository-import, file-edit, diff, command, cancellation, authorization, error, and Playwright tests.