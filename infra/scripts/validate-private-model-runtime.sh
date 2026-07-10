#!/usr/bin/env bash
set -euo pipefail

MODEL=""
ENDPOINT="${PRIVATE_MODEL_ENDPOINT_URL:-}"
EXPECTED_MODEL="${PRIVATE_MODEL_EXPECTED_NAME:-}"
STREAM="${PRIVATE_MODEL_VALIDATE_STREAM:-true}"
PROMPT="${PRIVATE_MODEL_VALIDATE_PROMPT:-Reply with exactly: private model runtime ok}"
API_KEY="${PRIVATE_MODEL_API_KEY:-}"

while [ "$#" -gt 0 ]; do
  case "$1" in
    --model) MODEL="${2:-}"; shift 2 ;;
    --endpoint) ENDPOINT="${2:-}"; shift 2 ;;
    --expected-model) EXPECTED_MODEL="${2:-}"; shift 2 ;;
    --no-stream) STREAM="false"; shift ;;
    --prompt) PROMPT="${2:-}"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 2 ;;
  esac
done

case "$MODEL" in
  small-test|qwen|llama405b) ;;
  *) echo "Usage: $0 --model small-test|qwen|llama405b --endpoint https://... [--expected-model name] [--no-stream]" >&2; exit 2 ;;
esac

if [ -z "$ENDPOINT" ]; then
  echo "FAIL endpoint missing: set PRIVATE_MODEL_ENDPOINT_URL or pass --endpoint" >&2
  exit 2
fi

export MODEL ENDPOINT EXPECTED_MODEL STREAM PROMPT API_KEY
node --input-type=module <<'NODE'
const endpoint = process.env.ENDPOINT.replace(/\/$/, '');
const expected = process.env.EXPECTED_MODEL;
const prompt = process.env.PROMPT;
const stream = process.env.STREAM === 'true';
const apiKey = process.env.API_KEY;
const headers = apiKey ? { authorization: `Bearer ${apiKey}` } : {};
const jsonHeaders = { 'content-type': 'application/json', ...headers };
const { execFile } = await import('node:child_process');
const { promisify } = await import('node:util');
const execFileAsync = promisify(execFile);
async function request(url, options = {}) {
  try {
    return await fetch(url, options);
  } catch (error) {
    const args = ['-4', '-sS', '-m', '60'];
    for (const [key, value] of Object.entries(options.headers || {})) args.push('-H', `${key}: ${value}`);
    if (options.method) args.push('-X', options.method);
    if (options.body) args.push('--data', options.body);
    args.push('-w', '\n__HTTP_STATUS__:%{http_code}', url);
    const { stdout } = await execFileAsync('curl', args, { maxBuffer: 1024 * 1024 });
    const marker = '\n__HTTP_STATUS__:';
    const index = stdout.lastIndexOf(marker);
    const body = index >= 0 ? stdout.slice(0, index) : stdout;
    const status = index >= 0 ? Number(stdout.slice(index + marker.length).trim()) : 0;
    return { ok: status >= 200 && status < 300, status, json: async () => JSON.parse(body || '{}'), text: async () => body };
  }
}
const startedAll = Date.now();
const result = { model: process.env.MODEL, endpoint, checks: {} };
async function timed(name, fn) {
  const started = Date.now();
  try {
    const value = await fn();
    result.checks[name] = { ...value, latencyMs: Date.now() - started };
  } catch (error) {
    result.checks[name] = { ok: false, error: error.message, latencyMs: Date.now() - started };
  }
}
await timed('models', async () => {
  const response = await request(`${endpoint}/v1/models`, { headers });
  const payload = await response.json().catch(() => ({}));
  const ids = Array.isArray(payload.data) ? payload.data.map((item) => item.id || item.root || item.name).filter(Boolean) : [];
  return { ok: response.ok && ids.length > 0 && (!expected || ids.some((id) => String(id).includes(expected))), status: response.status, modelIds: ids };
});
const modelName = expected || result.checks.models.modelIds?.[0] || 'private-model';
await timed('chat', async () => {
  const response = await request(`${endpoint}/v1/chat/completions`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ model: modelName, messages: [{ role: 'user', content: prompt }], temperature: 0, max_tokens: 128 }) });
  const payload = await response.json().catch(() => ({}));
  const text = (payload.choices?.[0]?.message?.content || payload.choices?.[0]?.text || '').trim();
  return { ok: response.ok && text.length > 0, status: response.status, text };
});
if (stream) {
  await timed('streaming', async () => {
    const response = await request(`${endpoint}/v1/chat/completions`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify({ model: modelName, messages: [{ role: 'user', content: prompt }], temperature: 0, max_tokens: 128, stream: true }) });
    const text = await response.text();
    return { ok: response.ok && text.length > 0, status: response.status, sample: text.slice(0, 500) };
  });
}
result.ok = Object.values(result.checks).every((check) => check.ok);
result.totalLatencyMs = Date.now() - startedAll;
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
NODE
