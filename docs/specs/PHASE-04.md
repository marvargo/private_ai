# Phase 04 — Project management

Implement full project CRUD and configurable project types. Persist name, description, type, status, cover, icon, tags, owner, actors, and archive/completion timestamps.

Project cards must use real database aggregates for members, invitations, chats, media, coding, workflows, integrations, documents, approvals, health, and last activity. Remove all fixed values.

Provide working create, edit, search, filter, sort, favorite, archive, restore, settings, leave, delete, and owner-change flows. Each control must call an authorized API and handle validation, loading, conflicts, and errors. Add shared DTOs, aggregate queries, API tests, authorization tests, and Playwright coverage.