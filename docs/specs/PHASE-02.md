# Phase 02 — SQL helpers, RLS, and authorization

Create/finish SQL helpers for project ownership, membership, role, permission, conversation access, and conversation edit rights. Complete RLS for projects, members, invitations, role permissions, activities, initiatives, tasks, approvals, notifications, workspace items, assets, conversations, messages, and analytics.

Permission resolution order: owner; member override; project role rule; global role template; deny.

Required tests use owner, co-admin, collaborator, member, viewer, and stranger identities. Verify cross-project isolation, standalone creator-only access, pending/revoked/expired invitation denial, viewer read-only behavior, and service-role application checks.

Deliver migration, SQL tests, API authorization tests, HTTPS/PostgREST behavioral tests, schema-verification scripts, and live-validation evidence through MCP or the operations bridge.