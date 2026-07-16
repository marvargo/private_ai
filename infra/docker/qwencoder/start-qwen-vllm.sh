#!/usr/bin/env bash
set -Eeuo pipefail

: "${MODEL_ID:=Qwen/Qwen2.5-Coder-7B-Instruct}"
: "${SERVED_MODEL_NAME:=wyndme-qwen-coder}"
: "${TENSOR_PARALLEL_SIZE:=1}"
: "${MAX_MODEL_LEN:=8192}"
: "${GPU_MEMORY_UTILIZATION:=0.85}"
: "${PORT:=8001}"
: "${VLLM_EXTRA_ARGS:=--trust-remote-code}"

mkdir -p /workspace/logs
LOG_FILE=/workspace/logs/qwen-vllm.log

exec > >(tee -a "$LOG_FILE") 2>&1

on_error() {
  code=$?
  echo "Qwen runtime startup failed with exit code ${code}"
  exit "$code"
}
trap on_error ERR

echo "Starting WyndMe Qwen runtime"
echo "MODEL_ID=$MODEL_ID"
echo "SERVED_MODEL_NAME=$SERVED_MODEL_NAME"
echo "TENSOR_PARALLEL_SIZE=$TENSOR_PARALLEL_SIZE"
echo "MAX_MODEL_LEN=$MAX_MODEL_LEN"
echo "GPU_MEMORY_UTILIZATION=$GPU_MEMORY_UTILIZATION"
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

echo "Launching vLLM OpenAI-compatible server"
exec python3 -m vllm.entrypoints.openai.api_server \
  --model "$MODEL_ID" \
  --tensor-parallel-size "$TENSOR_PARALLEL_SIZE" \
  --max-model-len "$MAX_MODEL_LEN" \
  --gpu-memory-utilization "$GPU_MEMORY_UTILIZATION" \
  --dtype auto \
  --served-model-name "$SERVED_MODEL_NAME" \
  --host 0.0.0.0 \
  --port "$PORT" \
  $VLLM_EXTRA_ARGS
