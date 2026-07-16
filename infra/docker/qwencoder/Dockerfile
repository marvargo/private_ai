FROM vllm/vllm-openai:v0.10.0

USER root

WORKDIR /opt/wyndme

COPY start-qwen-vllm.sh healthcheck.sh supervisor.py ./

RUN chmod +x /opt/wyndme/start-qwen-vllm.sh \
    /opt/wyndme/healthcheck.sh \
    /opt/wyndme/supervisor.py \
    && mkdir -p /workspace/models /workspace/logs

EXPOSE 8001 8002

ENTRYPOINT []
CMD ["/opt/wyndme/supervisor.py"]
