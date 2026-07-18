# Runtime Management

Runtime Management is the administrator-only control plane for private AI runtimes. The regular user experience remains focused on private chat, conversation history, generated outputs, permitted uploads, and the user's own profile. Regular users must not see RunPod, pod IDs, GPU models, GPU counts, GPU prices, runtime costs, provider endpoints, diagnostics endpoints, provider credentials, infrastructure logs, lifecycle controls, autoscaling settings, runtime policies, or tenant-wide usage.

Administrators can access the normal chat experience and the Runtime Management area at `/admin/runtime-management`.

## Admin routes

- `/admin/runtime-management`
- `/admin/runtime-management/runtimes`
- `/admin/runtime-management/models`
- `/admin/runtime-management/scaling`
- `/admin/runtime-management/costs`
- `/admin/runtime-management/logs`
- `/admin/runtime-management/settings`

Every Runtime Management API route is under `/admin/runtime-management` and requires an authenticated `admin` role. Unauthenticated calls return `401`; authenticated non-admin calls return `403` and record a sanitized audit event.

## Lifecycle defaults

Initial editable defaults are stored in the Runtime Management service and in migration `006_runtime_management.sql`:

- Idle timeout: 5 minutes
- Maximum lifetime: 30 minutes
- Auto-start: enabled
- Auto-stop: enabled
- Delete pod after stop: enabled
- Minimum runtimes: 0
- Health-check interval: configurable
- Scaling evaluation interval: configurable

Maximum lifetime begins when provider allocation starts and includes image pull, model download, loading, inference, and idle time. Idle timeout starts only after a runtime is healthy, resets after completed requests, and does not expire while an inference request or stream is active.

Stop reasons are tracked with these values: `idle_timeout`, `maximum_lifetime`, `admin_manual_stop`, `admin_restart`, `budget_limit`, `unhealthy_runtime`, `startup_timeout`, `scaling_down`, `emergency_stop`, `provider_failure`, `validation_cleanup`, and `other`.

## Runtime pools

Initial pools:

1. Small Test
2. Qwen Coding
3. Llama Thinking

The schema is designed for future Image Generation, Video Generation, Embeddings, Speech-to-text, and Text-to-speech pools without rewriting the lifecycle system.

## GPU policy

GPU profiles are persistent configuration, not hardcoded application logic.

- Small Test preferred profile: 1x RTX 4000 Ada. Fallbacks: RTX Pro 4000 and RTX 4090.
- Qwen Coding preferred profile: 1x RTX 5090. Fallbacks: 1x L40S, 1x RTX Pro 6000, and 1x H100 as last fallback.
- Llama Thinking preferred profile: 8x H200. Fallbacks are disabled by default and require explicit administrator enablement and approval.

The Llama 405B validation must not silently substitute 2x B300, 8x RTX 5090, a smaller model, or any other lower-power profile and claim 405B passed.

## Autoscaling

Scaling rules are data-driven and editable. Supported rule concepts include metrics, operators, thresholds, evaluation windows, consecutive evaluations, cooldowns, priority, enabled status, model-pool scope, maximum cost impact, and approval requirements.

Initial Qwen defaults:

- Minimum runtimes: 0
- Maximum runtimes: 10
- Maximum users per runtime: 10
- Maximum concurrent requests per runtime: 4
- Scale up on users per healthy runtime >= 8, queue depth >= 3, or average queue wait >= 5 seconds.
- Scale down when users per healthy runtime <= 2 and no queued or active requests persist for five evaluations.

Initial Llama defaults:

- Minimum runtimes: 0
- Maximum runtimes: 4
- Preferred profile: 8x H200
- Maximum users per runtime: 20
- Maximum concurrent requests per runtime: 4
- Scale-up requires administrator approval by default because each scale-up launches another full 8x H200 runtime.
- Scale down only when no requests or streams are active.

## Request routing and user-facing startup states

Runtime-aware request routing resolves the permitted model role, maps it to a runtime pool, excludes unhealthy/loading/stopping/capacity-full runtimes, then assigns the request to the best healthy runtime. If no healthy runtime exists, the system should auto-start or queue according to policy and show regular users only product-safe states such as:

- Preparing your private AI
- Loading the reasoning model
- Your request is queued
- Estimated wait
- Model is ready

Regular users must not see provider terms, GPU details, endpoints, logs, tensor parallel settings, or raw infrastructure errors.

## Costs and budgets

RunPod Pods are billed while GPU compute is allocated, including idle and model-loading time. Live estimates use:

```text
estimated_cost = provider_hourly_rate × billable_active_seconds ÷ 3600
```

Provider pricing responses are stored separately from normalized hourly rates so multi-GPU pricing is not multiplied twice. Estimated costs are not invoice amounts. Actual RunPod cost reconciliation should supplement or replace estimates after provider billing data is available.

Budget controls support global, model-pool, tenant, and optional user scopes with daily/monthly budgets, warning thresholds, hard-stop thresholds, launch blocking, approval thresholds, and notifications.

## Emergency stop

Emergency Stop All is administrator-only. It displays active runtime count and hourly burn, stops accepting new requests, handles queued work according to policy, stops active pods, terminates configured pods, retries idempotently, records audit events, and reports anything that could not be stopped.

## RunPod Pods versus Serverless Endpoints

This system currently creates and manages **RunPod Pods**. It does **not** create RunPod Serverless Endpoints. Pods are billed while allocated/running, including idle time, image pull time, and model-loading time.

## Configuration-driven architecture

Runtime Management configuration is database-authoritative after installation. The TypeScript service keeps installation-safe fallback values only so a fresh checkout can build, test, and render a setup screen before Supabase migration `006`/`007` is applied. Once rows exist in Supabase, the backend loads enabled GPU profiles, runtime pools, pool policies, and scaling rules from the database and uses those rows for Runtime Management settings and launches.

The following are editable administrator configuration, not permanent source-code constants: model ID, served model name, serving image, serving engine, preferred GPU type, GPU count, tensor-parallel size, context length, GPU memory utilization, storage volume, safe runtime ports, idle timeout, maximum lifetime, startup timeout, health-check interval, runtime counts, concurrent/user capacity, auto-start, auto-stop, autoscaling mode, rule metrics, thresholds, operators, evaluation windows, consecutive evaluation requirements, scale quantities, cooldowns, priorities, approvals, budgets, maximum hourly price, maximum projected session cost, and fallback GPU profiles.

Changing Llama from the seeded 8x H200 profile to another GPU profile must be done by selecting or creating a GPU profile in Runtime Management, running compatibility and cost preflight, and choosing how the change applies: new runtimes only, after current runtimes drain, rolling replacement, or immediate application after explicit confirmation. Existing active runtimes retain a configuration snapshot so cost, performance, and audit records remain tied to the launch configuration.

Autoscaling is generic: enabled rules are loaded from persistent configuration, metrics are evaluated using the configured operator and threshold, matching rules are recorded in scaling decisions, and actions are executed only according to approval and dry-run settings. Administrators can test rules without execution and use configuration versions to roll back prior settings.

## White-label user experience and routing

Regular users see product capabilities only: Chat, Studio, Coding, Workflows, Integrations, and Settings. Model names, model IDs, provider names, GPU names, endpoint URLs, and Runtime Management details are hidden from the regular workspace. Requests are submitted as capabilities and task categories; the orchestration layer resolves the configured runtime pool automatically.

Conversation privacy rules: conversations belong to projects, user conversation lists are owner-scoped, message content is not written to audit logs or admin Runtime Management views, and Supabase message storage supports encrypted content via the backend encryption key. Analytics record aggregate capability/category/duration/latency/token/cost/success data without raw prompts.
