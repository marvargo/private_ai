import { describe, expect, it } from 'vitest';
import { maskSecrets, secureErrorResponse } from './security.js';

describe('security utilities', () => {
  it('masks token-looking strings and sensitive object keys', () => {
    const masked = maskSecrets({ token: 'github_pat_abc123_SECRET', nested: { text: 'hf_secretToken' } });
    expect(JSON.stringify(masked)).not.toContain('github_pat_abc123_SECRET');
    expect(JSON.stringify(masked)).not.toContain('hf_secretToken');
    expect(masked).toMatchObject({ token: '[REDACTED]', nested: { text: '[REDACTED]' } });
  });

  it('returns secure generic errors with request ids', () => {
    expect(secureErrorResponse('req-1', 500)).toEqual({ error: 'Internal server error', requestId: 'req-1' });
  });
});
