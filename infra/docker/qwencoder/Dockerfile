FROM vllm/vllm-openai:latest
WORKDIR /opt/wyndme
COPY start-qwen-vllm.sh healthcheck.sh ./
RUN chmod +x *.sh
EXPOSE 8001
CMD ["/opt/wyndme/start-qwen-vllm.sh"]
