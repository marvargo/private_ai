import { describe, expect, it } from 'vitest';
import { createSession, createTask, listAuditLogs, listSessions, listTasks, updateSessionStatus } from '../repositories/testing/orchestratorTestStore.js';

describe('orchestrator store', () => {
  it('tracks sessions, tasks, and audit entries', () => {
    const session = createSession({ sessionName: 'prod-test', gpuType: 'NVIDIA H100 80GB HBM3', gpuCount: 8, estimatedHourlyCost: 21.52, maxHours: 4 });
    updateSessionStatus(session.id, 'running');
    createTask({ title: 'Review repo', description: 'Analyze GitHub repo', taskType: 'github_repo_change', modelRole: 'auto', priority: 'normal', riskLevel: 'low', allowedTools: ['read_github'], requiresApproval: false });
    expect(listSessions().some((item) => item.id === session.id && item.status === 'running')).toBe(true);
    expect(listTasks().length).toBeGreaterThan(0);
    expect(listTasks().find((task) => task.title === 'Review repo')?.assignedModelName).toContain('Qwen');
    expect(listAuditLogs().length).toBeGreaterThan(0);
  });
});
