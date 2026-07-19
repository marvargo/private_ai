# Phase 03 — Standalone workspace and optional projects

Personal workspace is the default and uses `project_id = null`. Remove automatic project creation/assignment from chat and all workspaces.

Implement typed APIs and UI for moving, copying, and removing project association for conversations, Studio assets, coding projects, workflows, integrations, and documents. Each operation verifies source ownership, target membership, target permission, content compatibility, and conflict rules; it executes transactionally and records structured activity without content text.

UI requirements: Personal workspace option, All/Personal/Project filters, visible context indicator, project chooser, move/copy dialogs, and preserved ownership/history. Add API, authorization, conflict, copy-integrity, and Playwright tests.