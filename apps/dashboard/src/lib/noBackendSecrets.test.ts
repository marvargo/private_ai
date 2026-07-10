import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { backendSecretEnvNamesForTest } from './authenticatedApi';

function files(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return files(path);
    return /\.(ts|tsx|js|jsx)$/.test(path) ? [path] : [];
  });
}

describe('dashboard secret hygiene', () => {
  it('does not reference backend-only secret environment names outside tests and the explicit denylist helper', () => {
    const allowed = new Set(['src/lib/authenticatedApi.ts', 'src/lib/authenticatedApi.test.ts', 'src/lib/noBackendSecrets.test.ts', 'src/lib/supabaseClient.test.ts'].map((path) => join(process.cwd(), path)));
    const violations = files(join(process.cwd(), 'src'))
      .filter((path) => !allowed.has(path))
      .flatMap((path) => backendSecretEnvNamesForTest().filter((name) => readFileSync(path, 'utf8').includes(name)).map((name) => `${path}:${name}`));

    expect(violations).toEqual([]);
  });
});
