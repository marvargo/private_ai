# Private Model Runtime Validation

Date: 2026-07-10

## Credential presence check

No secret values were printed, logged, or committed. Backend-only credentials were loaded from the local ignored operator environment for this validation pass.

| Variable | Status |
| --- | --- |
| `RUNPOD_API_KEY` | present in ignored local environment |
| `HF_TOKEN` | present in ignored local environment |
| `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` | present in ignored local environment |
| `SUPABASE_ACCESS_TOKEN` | present in ignored local environment |
| `ENCRYPTION_KEY` | present in ignored local environment |
| `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL` | present in ignored local environment |
| `SUPABASE_JWKS_URL` | present in ignored local environment |
| `QWEN_SERVER_API_KEY` | not required for the small-test path |
| `LLAMA_SERVER_API_KEY` | not required for the small-test path |

## Backend checks run

The API was started locally with a non-secret development `ADMIN_API_KEY=local-validation-key` so protected diagnostics could be exercised without exposing or committing real credentials.

| Check | Result |
| --- | --- |
| `GET /health` | passed: returned API health |
| `GET /status` | passed: private-by-default true, max session hours 4, auto-stop true, no production readiness warnings |
| `GET /models/access-check` | passed: Hugging Face metadata was visible for the enabled Llama and Qwen registry models |
| `GET /runpod/test` | passed: RunPod account lookup succeeded |
| `GET /runpod/gpu-targets` | passed: GPU catalog included 8x-capable H100/H200/B200-class targets |
| `GET /supabase/diagnostics` | passed: REST, auth-admin, and model registry diagnostics succeeded |

## Small-test model validation

Status: **failed live validation**.

### Live RunPod lifecycle attempt

| Item | Result |
| --- | --- |
| Template | `small-test` |
| Pod creation | passed |
| First pod ID | `cdffl5uf8amy2e` |
| Second pod ID after template/endpoint fixes | `72w2txc1v8li7g` |
| GPU actually assigned | H100 SXM |
| Session persistence | passed: sessions were created with one-hour auto-stop timestamps |
| Cost event path | passed: creation and stop/delete actions executed through backend lifecycle code |
| Audit log path | passed: lifecycle actions executed through audited backend routes |
| Manual stop | passed for both pods |
| Deletion cleanup | passed: `GET /runpod/pods` returned an empty list after cleanup |

### Runtime endpoint result

| Check | Result |
| --- | --- |
| Stable RunPod proxy format | fixed in code to use `https://<podId>-<internalPort>.proxy.runpod.net` |
| `/v1/models` direct endpoint | failed: RunPod proxy returned waiting/404 responses rather than OpenAI-compatible model JSON |
| `/v1/chat/completions` direct endpoint | not passed because `/v1/models` never became healthy |
| Streaming direct endpoint | not passed because `/v1/models` never became healthy |
| `infra/scripts/validate-private-model-runtime.sh` | failed against the live endpoint because model/chat/stream checks could not reach a healthy OpenAI-compatible service |
| API `POST /model/validate` | not passed because the live endpoint was not healthy |
| API `/chat/completions` | not run against the failed live endpoint |
| Dashboard chat | not run against the failed live endpoint |
| Emergency stop | not required after manual stops and delete cleanup; backend route remains implemented but this live pass did not need to stop active leftover pods |

### Root cause found and fixes made

1. The original endpoint URL normalizer incorrectly used the runtime IP/public port proxy form. RunPod documentation defines the stable HTTP proxy URL as `https://<pod-id>-<internal-port>.proxy.runpod.net`, so the code was fixed and covered by a unit test.
2. The initial small-test template used a placeholder private image. The template now uses a public vLLM image by default, an explicit TinyLlama model, H100-compatible GPU selection, one-hour runtime, and port 8000.
3. The remaining live blocker is that the public vLLM pod did not expose a healthy OpenAI-compatible `/v1/models` route before validation timeout. RunPod GraphQL did not expose pod logs through the attempted `podLogs` query, so the exact container-side failure could not be retrieved programmatically in this pass.

## Qwen Coder validation

Status: **not run**.

Reason: small-test live validation did not pass. Per the required validation order, Qwen must not be started until the cheaper small-test path is proven end-to-end.

Required next command after small-test passes:

```bash
infra/scripts/validate-private-model-runtime.sh --model qwen --endpoint "$QWEN_ENDPOINT_URL" --expected-model "$QWEN_SERVED_MODEL"
```

## Llama 405B validation

Status: **not run**.

Reason: small-test and Qwen live validations have not passed. Llama 405B must not be started until cheaper validation paths pass, GPU availability is confirmed, approval exists, budget guardrails are confirmed, and emergency stop is ready.

Required next command only after approval and Qwen pass:

```bash
infra/scripts/validate-private-model-runtime.sh --model llama405b --endpoint "$LLAMA_ENDPOINT_URL" --expected-model "$LLAMA_SERVED_MODEL"
```

## Validation automation status

- `infra/scripts/validate-private-model-runtime.sh` validates endpoint reachability, `/v1/models`, `/v1/chat/completions`, optional streaming, non-empty response text, expected model name, HTTP status, and latency.
- `POST /model/validate` runs OpenAI-compatible validation from the API and writes an audit event without exposing API keys in the dashboard.
- Unit coverage verifies the validation service against a mocked OpenAI-compatible endpoint.

## Current acceptance status

| Requirement | Status |
| --- | --- |
| Small test pod starts | live validated: passed |
| `/v1/models` real response | live validated: failed |
| `/v1/chat/completions` real answer | not passed |
| API `/model/validate` | not passed against live endpoint |
| API `/chat/completions` real answer | not run because live endpoint failed health |
| Dashboard chat real answer | not run because live endpoint failed health |
| Auto-stop scheduled | live validated: passed for created sessions |
| Manual stop works | live validated: passed |
| Emergency stop works | implemented; not required during this cleanup pass |
| Cost event stored | lifecycle path executed; should be verified by Supabase row query in the next pass |
| Audit log stored | lifecycle path executed; should be verified by Supabase row query in the next pass |

## Production blocker

The platform is **not production-ready** until a small-test pod exposes a healthy OpenAI-compatible endpoint and returns non-empty `/v1/chat/completions` output. Do not start Qwen or Llama 405B until this blocker is resolved.
