FROM nvidia/cuda:12.4.1-devel-ubuntu22.04
RUN apt-get update && apt-get install -y python3 python3-pip curl git && rm -rf /var/lib/apt/lists/*
WORKDIR /opt/wyndme
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt
COPY start-qwen-vllm.sh healthcheck.sh ./
RUN chmod +x *.sh
EXPOSE 8001
CMD ["/opt/wyndme/start-qwen-vllm.sh"]
