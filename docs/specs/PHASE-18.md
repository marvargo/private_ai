# Phase 18 — Integrations and MCP

Implement persistent integration definitions, connections, credential references, scopes, project assignments, MCP servers/tools, health checks, and execution history.

Support provider-neutral OAuth, API-key, webhook, database, email, calendar, CRM, storage, payment, and MCP adapters. Do not request credentials until a user connects that integration. Secrets remain backend-only and use the approved secret mechanism.

UI must support discover, connect, test, authorize, scope, assign to project, enable/disable, revoke, inspect health, and review sanitized execution history. MCP registration includes server validation, tool discovery, capability allowlists, and project permissions. Add adapter contract, auth-state, scope, revocation, health, permission, secret-redaction, and Playwright tests.