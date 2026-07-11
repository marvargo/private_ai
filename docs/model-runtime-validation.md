# Private Model Runtime Validation

Date: 2026-07-10

## Status summary

| Area | Status |
| --- | --- |
| Backend credential checks | passed with backend-only local environment; no secret values printed or committed |
| RunPod connection | live validated |
| RunPod GPU catalog | live validated; H100/H200/B200-class targets visible |
| Supabase diagnostics | live validated |
| Small-test public vLLM/TinyLlama | failed live validation: endpoint returned waiting/404 instead of OpenAI-compatible JSON |
| Small-test mock OpenAI proxy/platform validation | live validated |
| Real small-test AI inference | blocked until a reliable TinyLlama/vLLM image is published or selected |
| Qwen Coder | not run; blocked until real small-test inference passes |
| Llama 405B | not run; blocked until small-test and Qwen pass |

## Backend diagnostics

The local API was started with backend-only environment variables and a non-secret development `ADMIN_API_KEY=local-validation-key` for protected checks.

| Check | Result |
| --- | --- |
| `GET /health` | passed |
| `GET /status` | passed |
| `GET /models/access-check` | passed |
| `GET /runpod/test` | passed |
| `GET /runpod/gpu-targets` | passed |
| `GET /supabase/diagnostics` | passed |

## Phase 1 diagnosis: failed public vLLM endpoint

Observed with the public vLLM small-test pod:

- Pod creation worked.
- Runtime status eventually exposed ports.
- The stable proxy URL must use the pod ID and internal container port.
- The attempted `/v1/models` endpoint returned waiting/404 responses instead of model JSON.
- `/v1/chat/completions` did not pass because `/v1/models` was not healthy.
- RunPod GraphQL rejected the attempted `podLogs` query, so container-side logs were not available through that query.

Root-cause classification:

| Potential issue | Finding |
| --- | --- |
| Container never started | not the primary issue; ports appeared intermittently |
| Image failed to pull | not proven; pod reached runtime ports |
| Model download failed | possible, but logs were not available through attempted GraphQL query |
| vLLM command failed | possible, because OpenAI routes never became healthy |
| Port/proxy mismatch | partially fixed; endpoint formatter now prefers configured app ports |
| Endpoint not ready | not enough; repeated probes continued to fail |
| Wrong RunPod GraphQL fields | fixed by removing invalid `machine.gpuCount` query |
| Missing HF token inside pod | possible for real TinyLlama/vLLM path; mock path does not need HF |
| vLLM image entrypoint/args mismatch | possible and remains the real small-test blocker |

## Phase 2 proxy/platform validation image

Because `vllm/vllm-openai:latest` did not expose a healthy OpenAI-compatible route, the small-test template now supports a deterministic mock OpenAI-compatible image for **proxy/platform validation only**. This does not count as real AI inference.

| Item | Result |
| --- | --- |
| Image | `zerob13/mock-openai-api:latest` |
| Container port | `3000/http` |
| RunPod pod ID | `x0h6dlp9fml6sr` |
| Stable endpoint tested | `https://x0h6dlp9fml6sr-3000.proxy.runpod.net` |
| `/` | 200 with mock server metadata |
| `/health` | 200 |
| `/v1/models` | 200 with `mock-gpt-thinking` |
| `/v1/chat/completions` | 200 with non-empty assistant text |
| Streaming | 200 with SSE chunks |
| `POST /model/validate` | passed |
| API `/chat/completions` | passed when API was pointed at the mock endpoint for QA routing |
| Stop/delete cleanup | passed; `GET /runpod/pods` returned `[]` after cleanup |

Script validation result:

```json
{
  "model": "small-test",
  "checks": {
    "models": { "ok": true, "status": 200 },
    "chat": { "ok": true, "status": 200, "text": "Hello from the mock OpenAI chat completion." },
    "streaming": { "ok": true, "status": 200 }
  },
  "ok": true
}
```

## Phase 3 Supabase persistence verification

`GET /diagnostics/persistence/latest-runpod-validation` verified that the latest RunPod validation wrote real Supabase rows.

| Table | Verified result |
| --- | --- |
| `ai_sessions` | latest session `session_cc53c3fd-bbcb-4a1b-b023-2828026c3e97` |
| `model_runtimes` | 1 row for the latest session |
| `cost_events` | 2 rows for the latest session |
| `audit_logs` | 7 lifecycle audit rows for the latest pod/session |

## Remaining production blocker

The platform is still **not production-ready** for real inference. The mock image proves RunPod proxy + API + Supabase persistence plumbing, but real small-test AI inference remains blocked until a reliable TinyLlama/vLLM image and command are proven. Qwen and Llama must remain blocked until that real small-test inference path passes.

## Real small-test image rollout (2026-07-10 follow-up)

A controlled real small-test runtime image has been added under `infra/docker/smalltest-real/` and is built by the **Docker Small Test Real Runtime** workflow.

| Item | Status |
| --- | --- |
| Real image name | `ghcr.io/marvargo/private-ai-smalltest-real:latest` |
| Dockerfile added | implemented |
| OpenAI-compatible server added | implemented |
| Build/publish workflow added | implemented |
| RunPod template default mode | changed to `real` |
| Mock mode | available only with `RUNPOD_SMALL_TEST_MODE=mock` |
| vLLM mode | available only with `RUNPOD_SMALL_TEST_MODE=vllm` |
| Live real image pull | pending until workflow publishes image and RunPod can pull it |
| Live real small-test inference | pending |

The image must be published before live real-small-test validation. If RunPod cannot pull GHCR, make the package public or configure RunPod image pull credentials.

## Live worker-lock migration attempt

Attempted to apply `supabase/migrations/004_worker_locks_and_claims.sql` with Supabase CLI using the linked project. The CLI authenticated and linked the project, but database migration application could not complete from this environment because outbound Postgres pooler traffic on port 5432 is unreachable. The migration is therefore **not live-applied yet**.

Required verification after applying from an environment with DB connectivity:

- `ai_tasks.locked_at` exists
- `ai_tasks.locked_by` exists
- `ai_tasks.lock_expires_at` exists
- `public.claim_next_ai_task(worker_id text, lock_seconds integer)` exists

## 2026-07-11 Real Small-Test Validation Follow-up

Status category: **blocked**. Production-ready: **no**.

### Docker image and GHCR visibility

- Docker workflow: `Docker Small Test Real Runtime`
- Last successful workflow run URL: https://github.com/marvargo/private_ai/actions/runs/29114514232
- Image target: `ghcr.io/marvargo/private-ai-smalltest-real:latest`
- Image built/pushed: **yes**
- Public unauthenticated manifest check: **failed with HTTP 401 Unauthorized**
- Image visibility: **private or otherwise not anonymously pullable**
- RunPod pull result: **blocked/not run** because RunPod has not been given image pull credentials and the GHCR image is not publicly pullable from an unauthenticated manifest request.

### Live Supabase migration status

- `004_worker_locks_and_claims.sql` live-applied: **no**
- `005_small_test_model_registry.sql` live-applied: **no**
- Local migration files exist for both 004 and 005.
- MCP `execute_sql` was not available in this environment.
- Supabase CLI push previously reached project linking, but direct database push was blocked by the environment/database network path and requires an IPv4-compatible database URL or SQL execution from the Supabase dashboard/MCP.

Expected 004 verification SQL after apply:

```sql
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ai_tasks'
  and column_name in ('locked_at', 'locked_by', 'lock_expires_at')
order by column_name;

select proname
from pg_proc
where proname = 'claim_next_ai_task';
```

Expected 005 verification SQL after apply:

```sql
select model_family, model_role, served_model_name, priority, status
from public.model_registry
where model_family = 'test' and model_role = 'qa';
```

### Real inference gates

| Gate | Status | Notes |
| --- | --- | --- |
| `/health` | not run | Blocked before RunPod pod start by private GHCR image pull precondition. |
| `/v1/models` | not run | Blocked before RunPod pod start by private GHCR image pull precondition. |
| `/v1/chat/completions` | not run | Blocked before RunPod pod start by private GHCR image pull precondition. |
| Streaming | not run | Blocked before RunPod pod start by private GHCR image pull precondition. |
| API `/model/validate` | not run | Requires reachable real small-test endpoint. |
| API `/chat/completions` with `qa` / `small_test_validation` | not run | Code routing is implemented, live endpoint is still blocked. |
| Dashboard browser chat | not run | Requires reachable real small-test endpoint. |
| Worker real task execution | not run | Requires live 004 migration plus reachable real small-test endpoint. |
| Supabase persistence row verification | not run | Requires live pod/session run after migrations. |
| Qwen | not run | Correctly blocked until real small-test inference passes. |
| Llama 405B | not run | Correctly blocked until real small-test and Qwen pass. |

## 2026-07-11 Recovery verification from GitHub main

Status category: **blocked**. Production-ready: **no**.

This pass started from GitHub `main` and verified that the previously missing code changes are now present on GitHub `main` at commit `485f160789950725b9c94dd91bbc749fabd0758b`.

### Live Supabase verification

- `004_worker_locks_and_claims.sql` migration file exists in GitHub main.
- Live `ai_tasks` lock-column verification via Supabase REST failed with `column ai_tasks.locked_at does not exist`, so 004 is **not live-applied**.
- Supabase MCP resources are not exposed in this execution environment.
- The previously supplied Supabase Management/MCP token returned HTTP 403 against Supabase Management API/MCP, so it cannot be used here to execute SQL.
- The service-role/secret key can read/write table rows through PostgREST but cannot run DDL such as `alter table` or `create function`.

### Live small-test model registry row

The `test/qa` small-test registry row was inserted through backend-only Supabase service access because row-level REST writes are available. Verification query returned one row for:

- `model_family`: `test`
- `model_role`: `qa`
- `served_model_name`: `wyndme-small-test-real`
- `priority`: `1`
- `status`: `not_configured`

Important: this proves the row exists, but it is **not the same as applying the full 005 SQL migration**, because the unique index in `005_small_test_model_registry.sql` still requires SQL execution.

### Current live blockers

- 004 worker lock migration live-applied: **no**
- 005 migration full SQL live-applied: **no**
- 005 small-test registry row live-present: **yes**
- GHCR small-test image public pull: **blocked/not verified as public**
- Real small-test inference: **not run** because the real image pull and 004 SQL migration prerequisites are not satisfied.
- Qwen: **not run** because real small-test inference has not passed.
- Llama 405B: **not run** because real small-test and Qwen have not passed.

## 2026-07-11 Blocker-only execution attempt

Status category: **blocked**. Production-ready: **no**.

This pass intentionally did not start Qwen, Llama, dashboard polish, or real small-test pod validation because the two required prerequisites are still blocked.

### Blocker 1 — SQL execution path for 004/005

- Local `.env.local` was loaded without printing secret values.
- Required Supabase env values were present in the local runtime.
- Supabase MCP was configured in Codex with bearer-token env auth for project `zhcnrxcuyrxnrdqrfcfz`.
- Direct MCP HTTP initialization/list attempts returned Cloudflare HTTP 403 / Error 1010, so the Supabase MCP SQL tool is not usable from this runtime.
- Exact fallback check was run; `SUPABASE_DB_URL` is missing, so `psql` fallback cannot apply migrations.
- SQL execution method used: **blocked**.
- 004 migration live-applied: **no**.
- 005 migration full SQL live-applied: **no**.
- Existing live REST verification still shows the `test/qa` model registry row is present, but the 005 unique index cannot be applied without SQL execution.

### Blocker 2 — GHCR image pull access

- Docker workflow exists and the previous Docker Small Test Real Runtime workflow succeeded: https://github.com/marvargo/private_ai/actions/runs/29114514232
- Image target: `ghcr.io/marvargo/private-ai-smalltest-real:latest`
- Anonymous GHCR manifest check still returns HTTP 401 Unauthorized.
- GitHub package API visibility change was attempted with the available GitHub auth, but the token cannot access/change the package visibility.
- RunPod pull status: **blocked**, because the image is not anonymously pullable and image-pull credentials are not configured in the RunPod template/API path.

### Gates intentionally not run

- Real small-test pod creation: **not run**.
- Real small-test `/health`: **not run**.
- Real small-test `/v1/models`: **not run**.
- Real small-test `/v1/chat/completions`: **not run**.
- API `/model/validate`: **not run**.
- Worker real task execution: **not run**.
- Qwen: **not run**.
- Llama 405B: **not run**.
