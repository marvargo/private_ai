FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV HOST=0.0.0.0
ENV PORT=8000
ENV MODEL_ID=TinyLlama/TinyLlama-1.1B-Chat-v1.0
ENV SERVED_MODEL_NAME=wyndme-small-test-real
ENV HF_HOME=/workspace/models
ENV TRANSFORMERS_CACHE=/workspace/models

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl git ca-certificates build-essential \
  && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
  fastapi==0.115.6 \
  uvicorn[standard]==0.34.0 \
  transformers==4.48.0 \
  accelerate==1.2.1 \
  --extra-index-url https://download.pytorch.org/whl/cpu \
  torch

WORKDIR /app

COPY server.py /app/server.py
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=10 \
  CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD ["/app/start.sh"]
