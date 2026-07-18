import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('white-label regular user UI', () => {
  it('does not expose model or provider names on the chat page or primary navigation', () => {
    const root = process.cwd();
    const chat = readFileSync(join(root, 'src/app/(dashboard)/chat/page.tsx'), 'utf8');
    const layout = readFileSync(join(root, 'src/app/(dashboard)/layout.tsx'), 'utf8');
    for (const forbidden of ['Llama', 'Qwen', 'RunPod', 'H100', 'RTX5090', 'RTX 5090']) {
      expect(`${chat}\n${layout}`).not.toContain(forbidden);
    }
  });
});
