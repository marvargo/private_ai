# Production readiness plan

Current status: WyndMe Private AI has a buildable API, dashboard, shared model routing types, Supabase schema, live Supabase MCP access, RunPod/Hugging Face/GitHub integration scaffolds, credential encryption, approval gates, cost controls, and Supabase-backed orchestration for model registry, sessions, tasks, task logs, audit logs, cost events, approvals, and encrypted provider credentials.

The project is **not production-ready yet**. The remaining work is listed below in the order I will execute it.

## P0 — production blockers

1. **Complete persistent backend state**
   - Persist approvals in Supabase. **Implemented.**
   - Persist provider credentials in Supabase with encrypted values only. **Implemented.**
   - Persist runtime health state and RunPod pod lifecycle updates.
   - Remove or isolate in-memory state from production paths.

2. **Dashboard/API authentication**
   - Add Supabase Auth login to the dashboard.
   - Validate Supabase JWTs in the API.
   - Keep service-role/secret keys backend-only.
   - Add role-based admin authorization for destructive actions.

3. **RunPod provisioning workflows**
   - Implement create/start/stop/delete pod flows for:
     - Qwen Coder development runtime.
     - Llama 405B reasoning runtime.
     - Smaller test runtime.
   - Record pod IDs, endpoint URLs, runtime status, auto-stop deadlines, and cost events in Supabase.
   - Require approvals for expensive or destructive operations.

4. **AI worker/task execution**
   - Add a worker process that polls queued tasks from Supabase.
   - Route tasks by `model_role` / task type to Llama or Qwen.
   - Write task logs, outputs, errors, and final status to Supabase.
   - Implement the Llama → Qwen → Llama workflow for app builds.

5. **Model runtime health checks**
   - Poll OpenAI-compatible `/v1/models` or `/health` endpoints for each runtime.
   - Persist runtime health and last check times.
   - Block task execution when required runtime is unhealthy or stopped.

6. **Security hardening**
   - Add explicit RLS policies or keep all orchestration tables backend-only with no public policies.
   - Run Supabase security/performance advisors after every schema change.
   - Add audit trails for all production actions.
   - Rotate any tokens that were pasted into chat before production use.

## P1 — production quality

1. **Dashboard completion**
   - Authenticated admin shell.
   - Private chat with Auto / Llama / Qwen selector.
   - Task creation screen with Auto / Force Llama / Force Qwen.
   - Approvals queue.
   - Credential manager with redacted secrets only.
   - RunPod session controls with costs, health, and stop buttons.

2. **GitHub implementation**
   - Branch creation.
   - File editing workflow.
   - Test/build execution summaries.
   - Pull request creation.
   - Approval before production branches or destructive operations.

3. **Deployment and operations**
   - CI pipeline for tests, typecheck, build, and migrations.
   - Deployment manifests for API, dashboard, and worker.
   - Scheduled auto-stop worker/cron.
   - Runbooks for model start/stop, incident response, and cost shutdown.

4. **Observability**
   - Structured logs.
   - Runtime metrics.
   - Cost reports by session/model/task.
   - Error dashboards.

## P2 — scale and extensibility

1. Add model families beyond Llama/Qwen: GLM, DeepSeek, future open-weight reasoning/coding models.
2. Add model benchmark/evaluation records.
3. Add branch database environments for risky schema work.
4. Add multi-user/team permissions beyond initial admin-only mode.

## Current execution plan

I will continue in this order:

1. Persist remaining production state: runtime health and RunPod pod lifecycle updates.
2. Implement backend auth with Supabase JWT validation.
3. Add RunPod create/start/stop orchestration records.
4. Add the worker queue and model-routing execution loop.
5. Complete dashboard screens for chat, tasks, approvals, credentials, and sessions.
6. Add CI/deployment/operations hardening.
7. Perform live Qwen test runtime provisioning first, then Llama 405B 4-hour session after the cheaper path is validated.

## Live access status

- Supabase MCP access is configured and has been verified with `execute_sql`.
- Live Supabase schema has been initialized for the orchestration tables.
- RunPod and Hugging Face credentials should be rotated before production launch because they were pasted into chat during setup.

## Live validation status (2026-07-10)

- RunPod lifecycle and proxy/platform validation passed with the mock OpenAI-compatible small-test image.
- Real small-test AI inference is still blocked because the public vLLM/TinyLlama pod did not expose healthy `/v1/models` or `/v1/chat/completions`.
- Qwen and Llama 405B have not been started and remain blocked until real small-test inference passes.
- Supabase persistence rows were verified for the latest RunPod validation: ai_sessions, model_runtimes, cost_events, and audit_logs.
- Last known passing GitHub Actions run: https://github.com/marvargo/private_ai/actions/runs/29111838177.

## Worker lock migration live status

`supabase/migrations/004_worker_locks_and_claims.sql` exists in the repo, but the live migration application attempt from this environment failed because the Supabase Postgres pooler was unreachable on port 5432. Production worker locking must not be considered live until the migration is applied and verified from an environment with database connectivity.

## 2026-07-11 Production Readiness Follow-up

Status category: **blocked**. Production-ready: **no**.

Implemented in code:

- Real small-test runtime image and Docker publish workflow.
- Small-test QA routing for `small_test_validation` / validation-mode QA.
- `modelFamily = test` runtime client support.
- In-memory model registry activation when RunPod creates a small-test pod.
- Migration `005_small_test_model_registry.sql` for the live small-test registry row.
- Vault-first credential resolver with environment fallback.

Blocked live validations:

- Docker image was built/pushed, but unauthenticated GHCR manifest access returned HTTP 401. The package must be made public or RunPod image-pull credentials must be configured before RunPod can pull it.
- Worker lock migration 004 and small-test registry migration 005 are not live-applied from this environment because no MCP SQL execution tool is available and the database push path is not reachable without an IPv4-compatible database URL or dashboard SQL execution.
- Real small-test inference, dashboard browser chat, worker real AI task execution, Qwen, and Llama remain **not run**.

## 2026-07-11 Recovery verification from GitHub main

Status category: **blocked**. Production-ready: **no**.

The code changes for credential resolver, small-test QA routing, `modelFamily = test`, RunPod model-family metadata, runtime activation, and migration file `005_small_test_model_registry.sql` are present on GitHub `main`.

Live Supabase status:

- 004 worker lock migration live-applied: **no**. Verification through PostgREST showed `ai_tasks.locked_at` is missing.
- 005 SQL migration live-applied: **no**. The small-test registry row exists, but the unique index and formal SQL migration still require a SQL execution backend.
- Supabase MCP/Management API SQL execution is blocked in this environment because the available Management/MCP token returns HTTP 403 and no MCP server is exposed to the tool runtime.

Production remains blocked until SQL execution is available for 004/005, the GHCR image is pullable by RunPod, and real small-test inference passes before Qwen/Llama validation.

## 2026-07-11 Blocker-only execution attempt

Status category: **blocked**. Production-ready: **no**.

The requested blocker-only pass confirmed both release-gate blockers remain unresolved:

1. **Supabase SQL execution path is blocked.** Supabase MCP was configured with bearer-token env auth, but direct MCP access from this runtime returned HTTP 403 / Cloudflare Error 1010. `SUPABASE_DB_URL` is missing, so the required fallback `psql` path cannot apply migrations 004/005.
2. **RunPod image pull is blocked.** The real small-test GHCR image was built by the Docker workflow, but anonymous manifest access returns HTTP 401 and the available GitHub auth cannot change package visibility through the GitHub packages API.

Because those prerequisites remain blocked, real small-test pod validation, worker validation, Qwen validation, and Llama validation were intentionally not run.


## 2026-07-15 Supabase SQL unblocked; image pull still blocked

Status category: **blocked**. Production-ready: **no**.

Resolved:

- Supabase SQL execution path is now working through Supabase MCP direct JSON-RPC.
- Migration 004 is live-applied and verified: `ai_tasks.locked_at`, `ai_tasks.locked_by`, `ai_tasks.lock_expires_at`, and `claim_next_ai_task` exist.
- Migration 005 is live-applied and verified: `model_registry` has the `test` / `qa` / `wyndme-small-test-real` row.

Still blocked:

- RunPod cannot yet pull `ghcr.io/marvargo/private-ai-smalltest-real:latest` because anonymous GHCR manifest access returns HTTP 401 and the available GitHub token cannot change package visibility.
- Real small-test inference, worker real task execution, Qwen, and Llama remain not run until image pull is fixed.

## 2026-07-15 blocker status update

The two immediate blockers are now resolved enough to complete the real small-test gate:

- Supabase SQL execution path: unblocked through Supabase MCP direct JSON-RPC; migrations 004 and 005 are live-applied and verified.
- RunPod image pull access: unblocked by creating RunPod container registry credentials for the private GHCR image and passing the registry auth ID into pod creation.

Current readiness categories:

- implemented in code: private RunPod registry auth support, small-test registry-auth template wiring, chat-only validation task classification, worker-side runtime health check before task execution, and stop/delete cost-event persistence.
- mock/platform validated: RunPod API and Supabase persistence paths.
- real small-test inference validated: yes.
- Qwen validated: not run; remains blocked until explicitly proceeding after small-test.
- Llama validated: not run; remains blocked until Qwen passes.
- production-ready: no.

Remaining blockers before production-ready:

1. Review the real small-test validation artifacts and decide whether to proceed to Qwen validation.
2. Build or make pullable the Qwen runtime image, then validate Qwen end-to-end.
3. Only after Qwen passes, run the Llama 405B validation gate.
4. Harden deployment operations, monitoring, production secrets rotation, and long-running worker/auto-stop scheduling.

## 2026-07-16 Qwen validation status

Status category: **blocked**. Production-ready: **no**.

The accepted real small-test gate allowed Qwen validation to start. Qwen validation is not complete.

Resolved in this pass:

- Added and pushed a Qwen Docker workflow for `ghcr.io/marvargo/qwen-coder-vllm:latest`.
- Changed the Qwen runtime image to use the official vLLM OpenAI base image with WyndMe startup/health scripts.
- Added Qwen RunPod template environment overrides for model ID, image, port, tensor parallel size, context length, GPU count, volume, registry auth, and validation cost.
- Added runtime env injection for Hugging Face access without committing or printing secrets.
- Added worker/task-executor support for chat-only coding validation and model-family logging.

Live validation results:

- Qwen image pull through RunPod private registry auth: **passed**.
- Qwen pod create/stop/delete: **passed**.
- Qwen endpoint health and `/v1/models`: **failed** for the tested 30B, 14B, and 7B Qwen Coder configurations.
- Qwen inference, backend chat, dashboard chat, worker task, and successful Qwen persistence: **not passed**.
- Llama 405B: **not run** because Qwen has not passed.

Production remains blocked until Qwen reaches a healthy private vLLM endpoint, passes direct `/v1/models` and `/v1/chat/completions`, passes API validation, completes a worker task, and is cleaned up with persisted audit/cost rows.

## 2026-07-16 Qwen validation passed

Status category: **Qwen validated**. Production-ready: **no**.

Resolved:

- Corrected Qwen container startup by pinning `vllm/vllm-openai:v0.10.0`, clearing the inherited base-image entrypoint, and running `/opt/wyndme/supervisor.py` as the effective command.
- Added diagnostics port `8002` with `/health`, `/status`, and `/logs?tail=...` so startup failures are retrievable without relying on unsupported RunPod logs GraphQL fields.
- Switched validation defaults to the practical `Qwen/Qwen2.5-Coder-7B-Instruct` route: 1x H100, tensor parallel 1, 8192 context, 150 GB volume, and 1-hour validation session.
- Preserved `Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8` as the future full-scale Qwen target.
- Validated Qwen `/v1/models`, `/v1/chat/completions`, streaming, API `/model/validate`, backend coding chat, worker task completion, Supabase persistence, and pod cleanup.

Still pending before production-ready:

1. Validate Llama 405B reasoning runtime end-to-end.
2. Validate dashboard browser chat with a real authenticated admin session.
3. Deploy API, dashboard, and worker to persistent production hosting.
4. Configure always-on worker/auto-stop scheduling, production monitoring, error reporting, budget alerts, and incident runbooks.
5. Rotate pasted setup credentials only after replacement credentials are installed and verified.

## 2026-07-17 Llama 405B readiness update

The platform remains **not production-ready**. Real small-test and Qwen validation are accepted as passed, but Llama 405B inference, browser-authenticated dashboard validation, and production deployment hardening are still pending.

### Implemented in code

- Llama 405B runtime image switched to `ghcr.io/marvargo/llama405b-vllm:latest`.
- Llama serving base image is pinned to `vllm/vllm-openai:v0.10.0`.
- The inherited vLLM entrypoint is cleared and the effective command is the WyndMe diagnostics supervisor.
- Llama runtime exposes port `8000` for OpenAI-compatible inference and port `8002` for diagnostics.
- Llama diagnostics expose `/health`, `/status`, and `/logs?tail=200`, with redaction for token-like values.
- Llama RunPod templates now pass model/runtime settings through environment variables and use the existing private GHCR registry-auth path.
- A Llama Docker workflow builds and publishes `ghcr.io/marvargo/llama405b-vllm:latest` only after Dockerfile smoke checks pass.

### Remaining production blockers

1. Publish and verify the hardened Llama image can be pulled by RunPod.
2. Verify Hugging Face gated access to `meta-llama/Meta-Llama-3.1-405B-Instruct` without printing secrets.
3. Verify an 8-GPU RunPod profile with enough VRAM and disk is available and within budget.
4. Start Llama 405B only after preflight passes; poll diagnostics and `/v1/models` rather than relying on RunPod `RUNNING` alone.
5. Validate Llama direct inference, streaming, API `/model/validate`, backend routing, worker task execution, Supabase persistence, and cleanup.
6. Complete browser-authenticated dashboard validation for Qwen and Llama.
7. Deploy and validate the API, dashboard, and worker with monitoring, alerts, auto-stop, and emergency-stop in production.

## 2026-07-17 Llama launch blocker

Llama 405B is **not validated**. The hardened Llama image workflow and CI passed, Hugging Face gated model access passed, and an 8x H200 profile was selected for a four-hour maximum validation estimate of `$114.88`. The first Llama pod was created but exited before diagnostics became reachable; cleanup completed and no pod remained.

The exact blocker for retry is RunPod billing capacity: a follow-up image-pull probe was rejected with `INSUFFICIENT_BALANCE`. Add RunPod funds before retrying Llama image-pull diagnostics, 405B model load, inference validation, worker validation, dashboard validation, and production deployment hardening.
