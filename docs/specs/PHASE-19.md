# Phase 19 — Image Studio

Implement durable Studio projects, assets, versions, generation jobs, attempts, storage references, and exports for Personal and project contexts.

Required capabilities: upload, text-to-image, image-to-image, edit, inpaint, outpaint, background removal, variations, progress, cancellation, retry, history, comparison, download, and export. Use a configurable runtime pool selected internally; do not expose model/provider/GPU details.

Validate file type/size, storage ownership, project permission, generation parameters, quotas, budget, and moderation/category metadata without retaining prompt text in analytics. Jobs are asynchronous and resumable. Build asset library, editor/generation forms, job status, failure recovery, and Playwright tests.