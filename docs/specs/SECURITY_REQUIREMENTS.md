# Security requirements

- Never commit or log Supabase, GitHub, RunPod, or Hugging Face credentials.
- Use GitHub Environment Secrets for durable provider operations where available.
- Production must not silently fall back to in-memory persistence.
- Regular users must not receive internal model/provider/GPU/runtime identifiers in HTML, API payloads, errors, logs, or network responses.
- Raw prompts and decrypted content must not enter analytics, audit metadata, project activity, runtime logs, administrator dashboards, or error tracking.
- Conversation access requires ownership or explicit project permission before decryption.
- Production encryption must be mandatory, authenticated, versioned, and rotation-capable; no plaintext fallback.
- Service-role database calls must still enforce explicit application permissions.
- RLS must cover standalone and project-scoped data and be behaviorally tested with owner, collaborator, viewer, and stranger identities.
- All admin mutations require admin authorization, validation, idempotency, correlation IDs, and sanitized audit events.
- Destructive and billable runtime actions require explicit policy checks and approval where configured.