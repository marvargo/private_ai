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
