# WyndMe Small Test Real Runtime

This image is the real small-model validation runtime for RunPod.

It exposes:

- GET /health
- GET /v1/models
- POST /v1/chat/completions
- streaming via stream=true

Default model:

TinyLlama/TinyLlama-1.1B-Chat-v1.0

Served model:

wyndme-small-test-real

This is for proving real AI inference before starting Qwen or Llama 405B.
