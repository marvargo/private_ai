# RunPod setup

## Live catalog verification

Using the RunPod GraphQL API with an ephemeral API key, the account connection succeeded and the target GPU types were present in the catalog:

| Target | RunPod id | 8x VRAM | Secure cloud | Community cloud | 8x price signal |
| --- | --- | ---: | --- | --- | --- |
| 8x H100 80GB | `NVIDIA H100 80GB HBM3` | 640GB | yes | yes | priced at query time |
| 8x H200 | `NVIDIA H200` | 1128GB | yes | yes | uninterruptible price returned at query time |
| 8x B200 | `NVIDIA B200` | 1440GB | yes | yes | catalog present, no 8x price returned at query time |

Do not commit RunPod keys. Set `RUNPOD_API_KEY` only in the backend API environment. The dashboard must use `/runpod/*` API routes and must never receive this credential.

## Production target

Start with 8x H100 80GB or 8x H200 for Llama 3.1 405B. B200 appears in the catalog, but the API did not return a current 8x price signal during verification, so treat B200 as a candidate that must be checked again before provisioning.
