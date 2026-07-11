# CI Validation

Status category: **implemented in code** / **mock-platform validated** where applicable.

Last observed successful CI run for `main` before this follow-up branch state:

- CI: https://github.com/marvargo/private_ai/actions/runs/29114515407
- Docker Small Test Real Runtime: https://github.com/marvargo/private_ai/actions/runs/29114514232

The Docker workflow built and pushed `ghcr.io/marvargo/private-ai-smalltest-real:latest`, but the image manifest was not anonymously readable from GHCR during validation, so RunPod pull remains blocked until package visibility or registry credentials are fixed.
