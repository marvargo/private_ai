#!/usr/bin/env bash
set -euo pipefail
nvidia-smi --query-gpu=name,memory.total --format=csv,noheader || { echo "CUDA GPU check failed"; exit 1; }
