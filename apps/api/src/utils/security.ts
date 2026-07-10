const SECRET_PATTERNS = [
  /github_pat_[A-Za-z0-9_]+/g,
  /ghp_[A-Za-z0-9_]+/g,
  /hf_[A-Za-z0-9_]+/g,
  /sk-[A-Za-z0-9_-]+/g,
  /sb_secret_[A-Za-z0-9_]+/g,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
];

const SENSITIVE_KEYS = ['token', 'secret', 'password', 'apiKey', 'api_key', 'serviceRoleKey', 'authorization', 'cookie'];

export function maskSecrets(value: unknown): unknown {
  if (typeof value === 'string') {
    return SECRET_PATTERNS.reduce((masked, pattern) => masked.replace(pattern, '[REDACTED]'), value);
  }

  if (Array.isArray(value)) return value.map((item) => maskSecrets(item));

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
        key,
        SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase())) ? '[REDACTED]' : maskSecrets(entry),
      ]),
    );
  }

  return value;
}

export function secureErrorResponse(requestId: string, statusCode = 500) {
  return {
    error: statusCode >= 500 ? 'Internal server error' : 'Request failed',
    requestId,
  };
}
