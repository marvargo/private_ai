# Phase 09 — Privacy and encryption

Make production message encryption mandatory. Implement provider-neutral envelope encryption with authenticated encryption, record-specific nonce, key-envelope metadata, encryption versioning, rotation interfaces, and plaintext-migration tooling. Production startup/readiness must fail while plaintext fallback or unencrypted rows remain.

Authorization must be checked before decryption. Ordinary administrator routes and dashboards may manage metadata and aggregate usage but may not retrieve private prompt or response content. Decrypted text exists only transiently in the authorized inference path.

Add key-management interfaces compatible with Supabase Vault or a future managed KMS without adding new provider credentials. Document the trust boundary honestly; do not claim zero knowledge. Add tamper, wrong-key, rotation, migration, access-control, logging-redaction, and admin-denial tests.