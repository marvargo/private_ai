#!/usr/bin/env bash
set -Eeuo pipefail

trap 'code=$?; echo "Llama vLLM startup failed with exit code ${code}"; exit ${code}' ERR

: "${MODEL_ID:=meta-llama/Meta-Llama-3.1-405B-Instruct}"
: "${SERVED_MODEL_NAME:=wyndme-llama-405b}"
: "${TENSOR_PARALLEL_SIZE:=8}"
: "${MAX_MODEL_LEN:=32768}"
: "${GPU_MEMORY_UTILIZATION:=0.88}"
: "${MODEL_QUANTIZATION:=fp8}"
: "${PORT:=8000}"
: "${VLLM_EXTRA_ARGS:=--trust-remote-code}"

mkdir -p /workspace/logs /workspace/models
LOG_FILE=/workspace/logs/llama-vllm.log

exec > >(tee -a "$LOG_FILE") 2>&1

echo "Starting WyndMe Llama 405B runtime"
echo "MODEL_ID=$MODEL_ID"
echo "SERVED_MODEL_NAME=$SERVED_MODEL_NAME"
echo "TENSOR_PARALLEL_SIZE=$TENSOR_PARALLEL_SIZE"
echo "MAX_MODEL_LEN=$MAX_MODEL_LEN"
echo "GPU_MEMORY_UTILIZATION=$GPU_MEMORY_UTILIZATION"
echo "MODEL_QUANTIZATION=$MODEL_QUANTIZATION"
echo "PORT=$PORT"

python3 --version
python3 -c 'import vllm; print("vLLM", vllm.__version__)'
python3 -c 'import huggingface_hub; print("huggingface_hub", huggingface_hub.__version__)'
nvidia-smi || true

python3 - <<'PY'
import os
from huggingface_hub import model_info

model = os.environ["MODEL_ID"]
token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
info = model_info(model, token=token)
print("Model access verified:", info.id)
PY

args=(
  python3 -m vllm.entrypoints.openai.api_server
  --model "$MODEL_ID"
  --tensor-parallel-size "$TENSOR_PARALLEL_SIZE"
  --max-model-len "$MAX_MODEL_LEN"
  --gpu-memory-utilization "$GPU_MEMORY_UTILIZATION"
  --dtype auto
  --served-model-name "$SERVED_MODEL_NAME"
  --host 0.0.0.0
  --port "$PORT"
)

if [[ -n "${MODEL_QUANTIZATION:-}" && "$MODEL_QUANTIZATION" != "none" ]]; then
  args+=(--quantization "$MODEL_QUANTIZATION")
fi

# shellcheck disable=SC2206
extra_args=( $VLLM_EXTRA_ARGS )
args+=("${extra_args[@]}")

exec "${args[@]}"
