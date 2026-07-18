# White-label platform phase implementation

The product user experience is white-label: regular users interact with capabilities and projects, not model names, provider names, GPUs, endpoints, or Runtime Management details.

## Phase 2 — Studio

Studio is project-scoped and stores visual, media, scene, storyboard, timeline, asset-library, and generated-media records through `/studio/assets`. Long-form movie creation is represented as many project scene/assets records rather than a single model call.

## Phase 3 — Coding

Coding is project-scoped and stores software workspace records through `/coding/projects`. The UI is prepared for file tree, editor, preview, build, deploy, source control, environment variables, terminal output, and project history while runtime selection remains automatic.

## Phase 4 — Workflows

Workflows are project-scoped records through `/workflows`. The workspace is prepared for visual builder, natural-language builder, triggers, actions, conditions, loops, approvals, schedules, execution history, and retry policies.

## Phase 5 — Integrations

Integrations are project-scoped records through `/integrations`. Supported categories are configuration, not UI model choices, and include MCP servers, native integrations, OAuth, API-key connections, webhooks, databases, payments, storage, email, calendar, CRM, and future integrations.

## Phase 6 — Analytics

Analytics must not store prompts. The platform stores aggregate capability/category metrics such as duration, latency, tokens, cost, success, and failure through `capability_usage_events`; user-facing APIs return owner/project scoped summaries without prompt text.

## Phase 7 — Browser validation

Automated white-label UI tests assert regular workspace pages do not expose infrastructure/model/provider/GPU terms. Runtime Management remains administrator-only.

## Phase 8 — Llama validation

Llama 405B validation remains a controlled Runtime Management operation and must not be run from a one-off user flow. It should only proceed after Runtime Management policy, budget, GPU availability, image pull, Hugging Face access, and approval preflights pass.
