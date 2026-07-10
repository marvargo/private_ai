#!/usr/bin/env bash
set -euo pipefail
huggingface-cli download "${MODEL_ID:-meta-llama/Meta-Llama-3.1-405B-Instruct}" --local-dir "${MODEL_CACHE_DIR:-/workspace/models}"
