import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('project dashboard UI privacy', () => {
  it('renders required project sections without infrastructure terms', () => {
    const root = process.cwd();
    const page = readFileSync(join(root, 'src/app/(dashboard)/projects/[projectId]/page.tsx'), 'utf8');
    for (const required of ['My work', 'Team activity', 'Current initiatives', 'Recent activity', 'AI and workflow activity', 'Pending approvals', 'Recent assets and outputs', 'Project health', 'Usage and cost summary', 'Upcoming items', 'Team', 'Realtime updates']) expect(page).toContain(required);
    for (const forbidden of ['RunPod', 'H100', 'H200', 'RTX5090', 'raw prompt']) expect(page).not.toContain(forbidden);
  });
});
