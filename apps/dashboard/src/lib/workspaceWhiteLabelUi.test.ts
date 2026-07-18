import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('workspace white-label UI', () => {
  it('does not expose infrastructure names in user workspaces', () => {
    const root = process.cwd();
    const files = ['studio/page.tsx', 'coding/page.tsx', 'workflows/page.tsx', 'integrations/page.tsx'].map((file) => readFileSync(join(root, `src/app/(dashboard)/${file}`), 'utf8')).join('\n');
    for (const forbidden of ['Llama', 'Qwen', 'RunPod', 'H100', 'H200', 'RTX5090', 'RTX 5090', 'model ID']) expect(files).not.toContain(forbidden);
  });
});
