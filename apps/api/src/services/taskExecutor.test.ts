import { describe, expect, it } from 'vitest';
import { createTask, listTaskLogs } from './orchestrator.js';
import { runTask, retryTask, resolveTaskModelRole } from './taskExecutor.js';
import { listModelRegistry, updateModelRuntimeStatus } from './modelRegistry.js';

const fakeFetch = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'done' } }] }) }) as any;

describe('task executor', () => {
  it('maps task types to private model roles', () => {
    expect(resolveTaskModelRole('app_development')).toBe('coding');
    expect(resolveTaskModelRole('supabase_schema')).toBe('database');
    expect(resolveTaskModelRole('research')).toBe('research');
    expect(resolveTaskModelRole('small_test_validation')).toBe('qa');
  });

  it('runs queued tasks, saves logs, and marks completed', async () => {
    const model = listModelRegistry().find((entry) => entry.modelRole === 'coding')!;
    updateModelRuntimeStatus(model.id, 'healthy', 'http://private-qwen.test');
    const task = await createTask({ title: 'Build feature', description: 'Implement safely', taskType: 'app_development', priority: 'normal', riskLevel: 'low', allowedTools: ['read_tools', 'write_github_branch'], requiresApproval: false, modelRole: 'auto' });
    const result = await runTask(task.id, { fetch: fakeFetch });
    expect(result.ok).toBe(true);
    const logs = await listTaskLogs(task.id);
    expect(logs.some((log) => log.message.includes('Task completed'))).toBe(true);
  });

  it('pauses tasks that require approval', async () => {
    const task = await createTask({ title: 'Prod action', description: 'Needs approval', taskType: 'deployment_review', priority: 'high', riskLevel: 'high', allowedTools: ['production_gated'], requiresApproval: true, modelRole: 'auto' });
    const result = await runTask(task.id, { fetch: fakeFetch });
    expect(result).toMatchObject({ ok: false, status: 'waiting_approval' });
    await expect(retryTask(task.id)).resolves.toMatchObject({ ok: true, status: 'queued' });
  });
});
