# Multi-model routing

WyndMe Private AI is now designed as a private multi-model AI factory:

- Llama 3.1 405B is the reasoning, research, business, architecture, and final-review model.
- Qwen Coder is the coding, debugging, repo-editing, SQL, Supabase migration, testing, build-fix, and implementation model.

## Roles

Supported task `model_role` values:

- `business_reasoning`
- `research`
- `architecture`
- `coding`
- `qa`
- `database`
- `devops`
- `auto`

When `model_role=auto`, the backend applies deterministic routing. Business, BRD, product, research, competitive analysis, architecture, and final-review tasks go to Llama. Code generation, debugging, GitHub changes, Supabase migrations, SQL, tests, build errors, deployment scripts, and DevOps implementation go to Qwen Coder.

## Privacy

Both models are private RunPod-hosted OpenAI-compatible endpoints. No OpenAI, Anthropic, Gemini, hosted Meta, or other external LLM provider is called unless an admin explicitly enables external providers later.
