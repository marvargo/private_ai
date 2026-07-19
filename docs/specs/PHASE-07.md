# Phase 07 — Collaborative project dashboard

Replace simulated dashboard data with authorized persisted queries. Implement header, My Work, Team Activity, Initiatives, Recent Activity, AI/Workflow Activity, Pending Approvals, Recent Assets, Health, Usage/Cost, Upcoming Items, Team, and Quick Actions.

My Work is derived from assignments and recent owned work. Health is computed from integration/workflow/deployment failures, overdue work, approvals, storage, security notices, and invitations. Costs come from real attributed events with estimates and reconciled values clearly separated.

All quick actions must navigate to working project-scoped flows. Add typed shared DTOs, loading/error/empty states, and Supabase Realtime subscriptions for authorized activity, tasks, approvals, assets, notifications, and membership changes. Add API, permission, realtime, and Playwright tests.