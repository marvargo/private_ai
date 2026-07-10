# Model access checks

The API includes `GET /models/access-check` to verify Hugging Face access for every enabled private model in the registry. The check uses `HF_TOKEN` only on the backend and does not expose or return the token.

Current live verification with an ephemeral token confirmed:

- `meta-llama/Meta-Llama-3.1-405B-Instruct`: HTTP 200, gated/manual model access visible to the token.
- `Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8`: HTTP 200, public/non-gated metadata visible to the token.

Because tokens pasted into chat should be treated as exposed, rotate the token before production use and store the replacement only in the backend secret manager or API environment.
