# Llama 405B setup

The Llama 405B runtime is the full-scale reasoning target. Do not mark it validated until the actual 405B model loads and answers through the private endpoint.

## Runtime image

- Image: `ghcr.io/marvargo/llama405b-vllm:latest`
- Base image: pinned `vllm/vllm-openai:v0.10.0`
- Effective entrypoint: `[]`
- Effective command: `["/opt/wyndme/supervisor.py"]`
- Inference port: `8000`
- Diagnostics port: `8002`
- Diagnostics routes: `/health`, `/status`, `/logs?tail=200`

## Model configuration

- Model ID: `meta-llama/Meta-Llama-3.1-405B-Instruct`
- Served model name: `wyndme-llama-405b`
- Tensor parallel size: `8`
- Context length: `32768`
- Quantization: `fp8` by default; change only if the selected hardware/engine requires it.
- GPU memory utilization: `0.88` by default.

## Required launch preflight

Before creating a Llama pod, verify:

1. The GHCR image workflow has published `ghcr.io/marvargo/llama405b-vllm:latest`.
2. RunPod can pull the image through private registry authentication.
3. Hugging Face gated access works for `meta-llama/Meta-Llama-3.1-405B-Instruct`.
4. RunPod inventory has an 8-GPU profile with enough VRAM, preferably 8x H100 80GB, 8x H200, or 8x B200.
5. Volume/cache size is sufficient for 405B model weights.
6. Four-hour maximum validation runtime, budget guardrail, approval, auto-stop, and emergency-stop are all active.

If any preflight fails, do not start the pod. Record the exact blocker and keep Llama 405B status as not validated.
