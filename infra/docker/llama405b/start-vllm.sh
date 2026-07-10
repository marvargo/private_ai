#!/usr/bin/env bash
set -euo pipefail
: "${MODEL_ID:=meta-llama/Meta-Llama-3.1-405B-Instruct}"
: "${TENSOR_PARALLEL_SIZE:=8}"
: "${MAX_MODEL_LEN:=32768}"
: "${GPU_MEMORY_UTILIZATION:=0.90}"
python3 -m vllm.entrypoints.openai.api_server --model "$MODEL_ID" --tensor-parallel-size "$TENSOR_PARALLEL_SIZE" --max-model-len "$MAX_MODEL_LEN" --gpu-memory-utilization "$GPU_MEMORY_UTILIZATION" --dtype auto --served-model-name wyndme-llama-405b --host 0.0.0.0 --port 8000
