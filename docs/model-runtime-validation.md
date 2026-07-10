# Private Model Runtime Validation

Date: 2026-07-10

## Credential presence check

No secret values were printed. The runtime environment used for this validation pass had the following credential status:

| Variable | Status |
| --- | --- |
| `RUNPOD_API_KEY` | missing |
| `HF_TOKEN` | missing |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` | missing |
| `SUPABASE_ACCESS_TOKEN` | missing |
| `ENCRYPTION_KEY` | missing |
| `NEXT_PUBLIC_SUPABASE_URL` | missing |
| `SUPABASE_JWKS_URL` | missing |
| `QWEN_SERVER_API_KEY` | missing |
| `LLAMA_SERVER_API_KEY` | missing |

## Backend checks run

The API was started locally with a non-secret development `ADMIN_API_KEY=local-validation-key` so protected diagnostics could be exercised without exposing or committing real credentials.

| Check | Result |
| --- | --- |
| `GET /health` | passed: returned `{ ok: true, service: "wyndme-private-ai-api" }` |
| `GET /status` | passed: private-by-default true, max session hours 4, auto-stop true, runtime `not_configured` |
| `GET /models/access-check` | failed as expected: `HF_TOKEN is required for model access checks` |
| `GET /runpod/test` | failed as expected: `RUNPOD_API_KEY is required` returned as a sanitized internal error with request id |
| `GET /runpod/gpu-targets` | failed as expected: `RUNPOD_API_KEY is required` returned as a sanitized internal error with request id |
| `GET /supabase/diagnostics` | failed configuration: Supabase URL and service role key are required |

## Small-test model validation

Status: **not run**.

Reason: `RUNPOD_API_KEY`, `HF_TOKEN`, Supabase service credentials, and runtime endpoint credentials were not present in the environment. Per the safety requirement, no RunPod pod was created without credentials and no Llama 405B startup was attempted.

Required next command after credentials are present:

```bash
infra/scripts/validate-private-model-runtime.sh --model small-test --endpoint "$SMALL_TEST_ENDPOINT_URL" --expected-model "$SMALL_TEST_SERVED_MODEL"
```

## Qwen Coder validation

Status: **not run**.

Reason: small-test validation did not pass because credentials were absent. Qwen must not be started until the cheaper small-test path is proven.

Required next command after small-test passes:

```bash
infra/scripts/validate-private-model-runtime.sh --model qwen --endpoint "$QWEN_ENDPOINT_URL" --expected-model "$QWEN_SERVED_MODEL"
```

## Llama 405B validation

Status: **not run**.

Reason: small-test and Qwen live validations did not pass in this environment. Llama 405B must not be started until cheaper validation paths pass, GPU availability is confirmed, approval exists, budget guardrails are confirmed, and emergency stop is ready.

Required next command only after approval and Qwen pass:

```bash
infra/scripts/validate-private-model-runtime.sh --model llama405b --endpoint "$LLAMA_ENDPOINT_URL" --expected-model "$LLAMA_SERVED_MODEL"
```

## Validation automation added

- `infra/scripts/validate-private-model-runtime.sh` validates endpoint reachability, `/v1/models`, `/v1/chat/completions`, optional streaming, non-empty response text, expected model name, HTTP status, and latency.
- `POST /model/validate` runs the same OpenAI-compatible validation from the API and writes an audit event without exposing API keys in the dashboard.
- Unit coverage verifies the validation service against a mocked OpenAI-compatible endpoint.

## Current acceptance status

| Requirement | Status |
| --- | --- |
| Small test pod starts | not run |
| `/v1/models` real response | not run |
| `/v1/chat/completions` real answer | not run |
| API `/chat/completions` real answer | not run |
| Dashboard chat real answer | not run |
| Auto-stop scheduled | not run |
| Manual stop works | not run |
| Emergency stop works | not run |
| Cost event stored | not run |
| Audit log stored | partially code path exists; live persistence not validated due missing Supabase credentials |

## Blocker root cause

The blocker is environmental, not a code exception: required backend-only provider credentials were absent. The code now fails safely, reports sanitized errors, and documents the exact commands required for live validation once credentials and hardware are available.
