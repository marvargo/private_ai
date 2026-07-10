#!/usr/bin/env bash
set -euo pipefail
ENDPOINT="${1:-${PRIVATE_MODEL_ENDPOINT_URL:-}}"
if [ -z "$ENDPOINT" ]; then
  echo "Usage: $0 https://pod-port.proxy.runpod.net" >&2
  exit 2
fi
ENDPOINT="${ENDPOINT%/}"
for path in / /health /v1/models; do
  echo "== GET ${ENDPOINT}${path} =="
  curl -4 -sS -m 30 -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' "${ENDPOINT}${path}" | head -c 4000
  echo
 done
 echo "== POST ${ENDPOINT}/v1/chat/completions =="
 curl -4 -sS -m 60 -H 'content-type: application/json' -X POST "${ENDPOINT}/v1/chat/completions" \
   --data '{"model":"mock-gpt-thinking","messages":[{"role":"user","content":"Reply with private model runtime ok"}],"max_tokens":64}' \
   -w '\nHTTP_STATUS:%{http_code}\nTOTAL_TIME:%{time_total}\n' | head -c 4000
 echo
