#!/usr/bin/env bash
set -euo pipefail

echo "Starting WyndMe real small-test OpenAI-compatible runtime"
echo "MODEL_ID=${MODEL_ID}"
echo "SERVED_MODEL_NAME=${SERVED_MODEL_NAME}"
echo "HOST=${HOST}"
echo "PORT=${PORT}"

exec uvicorn server:app --host "${HOST}" --port "${PORT}"
