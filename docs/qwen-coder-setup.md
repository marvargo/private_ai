# Qwen Coder setup

Qwen Coder is the primary private development model. The default registry points to `Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8`, compatible with vLLM according to current public model documentation.

Use Qwen Coder for code generation, debugging, repo changes, Supabase migrations, SQL, tests, build errors, frontend/backend implementation, API integrations, and DevOps implementation. A cheaper GPU profile can be configured through `QWEN_GPU_PROFILE`, `QWEN_TENSOR_PARALLEL_SIZE`, and the RunPod `qwen-coder-pod-template.json`.
