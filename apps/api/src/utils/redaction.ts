const REDACTED = '[REDACTED]';

const SENSITIVE_KEY_PATTERNS = [
  /authorization/i,
  /api[_-]?key/i,
  /token/i,
  /secret/i,
  /password/i,
  /cookie/i,
  /prompt/i,
  /message[_-]?content/i,
  /encrypted[_-]?content/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /private[_-]?key/i,
  /client[_-]?secret/i,
];

const SENSITIVE_VALUE_PATTERNS = [
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/i,
  /\b(?:github_pat|ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]+\b/,
  /\bsbp_[A-Za-z0-9]+\b/,
  /\bsb_(?:secret|publishable)_[A-Za-z0-9._-]+\b/,
  /\brpa_[A-Za-z0-9]+\b/,
  /\bhf_[A-Za-z0-9]+\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];

function isSensitiveKey(key: string) {
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

function isSensitiveString(value: string) {
  return SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value));
}

function redactValue(value: unknown, force = false): unknown {
  if (force) return REDACTED;
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return isSensitiveString(value) ? REDACTED : value;
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return value;
  if (Array.isArray(value)) return value.map((item) => redactValue(item));
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return redactSensitiveObject(value as Record<string, unknown>);
  return value;
}

export function redactSensitiveValue(value: unknown): unknown {
  return redactValue(value);
}

export function redactSensitiveObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, redactValue(entry, isSensitiveKey(key))]),
  );
}
