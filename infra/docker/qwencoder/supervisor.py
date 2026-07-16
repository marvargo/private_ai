#!/usr/bin/env python3
import html
import json
import os
import re
import signal
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

LOG_FILE = Path('/workspace/logs/qwen-vllm.log')
STARTED_AT = time.time()
STATE = {
    'phase': 'initializing',
    'exit_code': None,
    'pid': None,
    'started_at': STARTED_AT,
    'updated_at': STARTED_AT,
}
SECRET_PATTERNS = [
    re.compile(r'(hf_|rpa_|github_pat_|sb_secret_|sbp_)[A-Za-z0-9_\-]+'),
    re.compile(r'(?i)(authorization:\s*bearer\s+)[^\s]+'),
    re.compile(r'(?i)((?:HF_TOKEN|HUGGING_FACE_HUB_TOKEN|RUNPOD_API_KEY|GITHUB_TOKEN)=)[^\s]+'),
]


def redact(text: str) -> str:
    value = text
    for pattern in SECRET_PATTERNS:
        value = pattern.sub(lambda m: (m.group(1) + '[REDACTED]') if m.lastindex else '[REDACTED]', value)
    return value


def tail_log(lines: int) -> str:
    if not LOG_FILE.exists():
        return ''
    data = LOG_FILE.read_text(errors='replace').splitlines()[-max(1, min(lines, 1000)):]
    return redact('\n'.join(data))


def child_watcher() -> None:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATE.update({'phase': 'starting', 'updated_at': time.time()})
    env = os.environ.copy()
    proc = subprocess.Popen(['/opt/wyndme/start-qwen-vllm.sh'], env=env)
    STATE.update({'phase': 'running', 'pid': proc.pid, 'updated_at': time.time()})
    code = proc.wait()
    STATE.update({'phase': 'exited', 'exit_code': code, 'updated_at': time.time()})


class Handler(BaseHTTPRequestHandler):
    server_version = 'WyndMeQwenSupervisor/1.0'

    def send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == '/health':
            self.send_json(200, {'ok': True, 'service': 'wyndme-qwen-supervisor', 'phase': STATE['phase']})
            return
        if parsed.path == '/status':
            self.send_json(200, {
                'ok': True,
                'modelId': os.environ.get('MODEL_ID', 'Qwen/Qwen2.5-Coder-7B-Instruct'),
                'servedModelName': os.environ.get('SERVED_MODEL_NAME', 'wyndme-qwen-coder'),
                'port': os.environ.get('PORT', '8001'),
                'phase': STATE['phase'],
                'exitCode': STATE['exit_code'],
                'pid': STATE['pid'],
                'uptimeSeconds': round(time.time() - STARTED_AT, 3),
                'updatedAt': STATE['updated_at'],
            })
            return
        if parsed.path == '/logs':
            params = parse_qs(parsed.query)
            tail = int(params.get('tail', ['200'])[0])
            text = tail_log(tail)
            body = text.encode('utf-8')
            self.send_response(200)
            self.send_header('content-type', 'text/plain; charset=utf-8')
            self.send_header('content-length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        escaped = html.escape(parsed.path)
        self.send_json(404, {'ok': False, 'error': f'Not found: {escaped}'})

    def log_message(self, fmt: str, *args) -> None:
        return


def handle_signal(signum, frame):
    STATE.update({'phase': 'stopping', 'updated_at': time.time()})
    raise SystemExit(0)


def main() -> None:
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)
    thread = threading.Thread(target=child_watcher, daemon=True)
    thread.start()
    port = int(os.environ.get('DIAGNOSTICS_PORT', '8002'))
    server = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    server.serve_forever()


if __name__ == '__main__':
    main()
