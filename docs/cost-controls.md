# Cost controls

Current guards:

- `MAX_SESSION_HOURS` defaults to 4.
- RunPod start requests are blocked when requested hours exceed the max session policy.
- Dashboard makes the 4-hour auto-stop visible in the command center.
- Sessions store an `autoStopAt` timestamp.

Next production step: add a persistent worker that scans active Supabase `ai_sessions` every five minutes and calls backend-only RunPod stop for sessions past `autoStopAt`.
