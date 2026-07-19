# Phase 05 — Memberships, invitations, and permissions

Persist members, invitations, roles, permission templates, and granular overrides. Implement invite, accept, reject, resend, revoke, expiry, role update, member removal, leave-project, and owner change workflows.

Invitation acceptance must be transactional, verify authenticated email, prevent duplicates, and create membership/activity/notification records. Do not grant access before acceptance. Because no email provider is configured, implement complete in-app delivery plus a provider-neutral email adapter and development inbox; never claim external delivery success.

Role permissions are database-authoritative. Protect owner-only operations and prevent removal of the only owner. Add APIs, member/invitation UI, role editor, audit records, SQL/API tests, and Playwright coverage.