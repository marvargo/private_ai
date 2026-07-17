#!/usr/bin/env python3
import json
import os
import re
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

LOG_FILE = Path("/workspace/logs/llama-vllm.log")
START_SCRIPT = "/opt/wyndme/start-vllm.sh"
REDACTION_PATTERNS = [
    re.compile(r"hf_[A-Za-z0-9_\-]+"),
    re.compile(r"rpa_[A-Za-z0-9_\-]+"),
    re.compile(r"github_pat_[A-Za-z0-9_\-]+"),
    re.compile(r"sb_secret_[A-Za-z0-9_\-]+"),
    re.compile(r"sbp_[A-Za-z0-9_\-]+"),
    re.compile(r"(?i)(authorization:\s*bearer\s+)[^\s]+"),
    re.compile(r"(?i)((?:hf_token|hugging_face_hub_token|runpod_api_key|github_token)\s*=\s*)[^\s]+"),
]

state = {
    "service": "wyndme-llama405b-supervisor",
    "phase": "starting",
    "childPid": None,
    "childExitCode": None,
    "startedAt": time.time(),
}
process = None


def redact(text: str) -> str:
    redacted = text
    for pattern in REDACTION_PATTERNS:
        if pattern.pattern.startswith("(?i)(authorization") or pattern.pattern.startswith("(?i)((?:hf_token"):
            redacted = pattern.sub(r"\1[redacted]", redacted)
        else:
            redacted = pattern.sub("[redacted]", redacted)
    return redacted


def tail_log(lines: int = 200) -> list[str]:
    if not LOG_FILE.exists():
        return []
    content = LOG_FILE.read_text(errors="replace").splitlines()
    return [redact(line) for line in content[-max(1, min(lines, 1000)):]]


def gpu_summary() -> str:
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total", "--format=csv,noheader"],
            check=False,
            text=True,
            capture_output=True,
            timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            return redact(result.stdout.strip())
        return "nvidia-smi unavailable"
    except Exception as exc:
        return f"gpu summary unavailable: {type(exc).__name__}"


def status_payload() -> dict:
    running = process is not None and process.poll() is None
    if running:
        phase = "running"
    elif state.get("childExitCode") is not None:
        phase = "exited"
    else:
        phase = state.get("phase", "starting")
    return {
        **state,
        "phase": phase,
        "childRunning": running,
        "childExitCode": state.get("childExitCode"),
        "modelId": os.environ.get("MODEL_ID", "meta-llama/Meta-Llama-3.1-405B-Instruct"),
        "servedModelName": os.environ.get("SERVED_MODEL_NAME", "wyndme-llama-405b"),
        "servingEngine": os.environ.get("SERVING_ENGINE", "vllm"),
        "port": int(os.environ.get("PORT", "8000")),
        "diagnosticsPort": int(os.environ.get("DIAGNOSTICS_PORT", "8002")),
        "tensorParallelSize": os.environ.get("TENSOR_PARALLEL_SIZE", "8"),
        "maxContext": os.environ.get("MAX_MODEL_LEN", "32768"),
        "modelQuantization": os.environ.get("MODEL_QUANTIZATION", "fp8"),
        "gpuInventory": gpu_summary(),
        "uptimeSeconds": int(time.time() - state["startedAt"]),
        "recentLogs": tail_log(40),
    }


def supervise() -> None:
    global process
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    state["phase"] = "launching-vllm"
    with LOG_FILE.open("a", encoding="utf-8") as log:
        log.write("Llama supervisor launching vLLM child process\n")
        log.flush()
        process = subprocess.Popen([START_SCRIPT], stdout=log, stderr=subprocess.STDOUT, text=True)
        state["childPid"] = process.pid
        state["phase"] = "vllm-running"
        exit_code = process.wait()
        state["childExitCode"] = exit_code
        state["phase"] = "exited"
        log.write(f"Llama vLLM child exited with code {exit_code}\n")
        log.flush()


class Handler(BaseHTTPRequestHandler):
    def _json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/health":
            payload = status_payload()
            status = 200 if payload["childRunning"] else 503
            self._json({"ok": payload["childRunning"], "phase": payload["phase"], "childExitCode": payload["childExitCode"]}, status)
            return
        if parsed.path == "/status":
            self._json(status_payload())
            return
        if parsed.path == "/logs":
            query = parse_qs(parsed.query)
            tail = int(query.get("tail", ["200"])[0])
            self._json({"logs": tail_log(tail)})
            return
        self._json({"ok": True, "service": "wyndme-llama405b-supervisor"})

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return


def main() -> None:
    port = int(os.environ.get("DIAGNOSTICS_PORT", "8002"))
    thread = threading.Thread(target=supervise, daemon=True)
    thread.start()
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
