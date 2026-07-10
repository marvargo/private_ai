#!/usr/bin/env bash
set -euo pipefail
test -n "${HF_TOKEN:-}" || { echo "HF_TOKEN missing"; exit 1; }
