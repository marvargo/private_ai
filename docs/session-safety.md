# Session safety controls

Production GPU sessions must be controllable before any expensive RunPod start is allowed.

Implemented controls:

- Manual session stop endpoint: `POST /sessions/:sessionId/stop`.
- Auto-stop check endpoint: `POST /sessions/auto-stop/check`.
- Emergency stop endpoint: `POST /sessions/emergency-stop`.
- Approval records for high-risk actions.
- Cost event recording when pod-backed sessions are stopped.
- Dashboard buttons for tracking a Qwen session, running auto-stop checks, and triggering emergency stop.

The next production step is to run the auto-stop checker as a worker every five minutes and persist sessions/cost events in Supabase instead of only the in-process store.
