#!/usr/bin/env bash
set -euo pipefail
: "${MODEL_ID:=Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8}"
: "${SERVED_MODEL_NAME:=wyndme-qwen-coder}"
: "${TENSOR_PARALLEL_SIZE:=4}"
: "${MAX_MODEL_LEN:=262144}"
: "${GPU_MEMORY_UTILIZATION:=0.90}"
: "${VLLM_EXTRA_ARGS:=--trust-remote-code}"
python3 -m vllm.entrypoints.openai.api_server \
  --model "$MODEL_ID" \
  --tensor-parallel-size "$TENSOR_PARALLEL_SIZE" \
  --max-model-len "$MAX_MODEL_LEN" \
  --gpu-memory-utilization "$GPU_MEMORY_UTILIZATION" \
  --dtype auto \
  --served-model-name "$SERVED_MODEL_NAME" \
  --host 0.0.0.0 \
  --port 8001 \
  $VLLM_EXTRA_ARGS
