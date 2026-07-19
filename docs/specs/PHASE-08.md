# Phase 08 — Complete chat

Implement conversation management for Personal and project contexts: create, rename, delete, archive/restore, pin, folders, search, filters, pagination, attachments, previews, move/copy, retry, regenerate, edit, branch, export, and cancellation.

Responses must stream incrementally from the private model endpoint to the browser, support cancellation and disconnects, track active requests, persist the final assistant message once, and mark interrupted responses as incomplete. Do not simulate streaming with one completed response.

Check authorization before metadata or content access. Failed requests must not duplicate messages. Build typed chat components and add API, persistence, authorization, streaming, accessibility, and Playwright tests. Do not expose internal model, provider, GPU, or endpoint details.