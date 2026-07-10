import { AiTask, ConcreteModelRole } from '@wyndme/shared';
import { privateChatCompletion } from './privateChat.js';
import { listTasks, updateTaskStatus, writeAudit, writeTaskLog } from './orchestrator.js';
import { assertModelRuntimeHealthy } from './modelRuntimeHealth.js';
import { selectModelForTask } from './modelRegistry.js';
import { classifyTaskAction, evaluatePermission, permissionFromTools } from './permissionEngine.js';

export interface TaskExecutorOptions {
  fetch?: typeof fetch;
}

const locks = new Set<string>();

export function resolveTaskModelRole(taskType: string): ConcreteModelRole {
  if (['app_development', 'bug_fix'].includes(taskType)) return 'coding';
  if (['supabase_schema'].includes(taskType)) return 'database';
  if (['deployment_review'].includes(taskType)) return 'devops';
  if (['github_repo_review'].includes(taskType)) return 'qa';
  if (['research'].includes(taskType)) return 'research';
  if (['brd_generation', 'product_strategy'].includes(taskType)) return 'business_reasoning';
  return selectModelForTask(taskType, 'auto').resolvedModelRole;
}

export function checkTaskToolPermissions(task: AiTask) {
  const allowed = new Set(task.allowedTools);
  if (task.riskLevel === 'critical' && !allowed.has('production_gated')) return { allowed: false, reason: 'Critical tasks require production_gated permission.' };
  if (task.taskType.includes('github') && ![...allowed].some((tool) => tool.includes('github') || tool === 'read_tools')) return { allowed: false, reason: 'GitHub task requires GitHub/read tool permission.' };
  if (task.taskType.includes('supabase') && ![...allowed].some((tool) => tool.includes('supabase') || tool === 'read_tools')) return { allowed: false, reason: 'Supabase task requires Supabase/read tool permission.' };
  return { allowed: true };
}

function taskPrompt(task: AiTask) {
  return `Task type: ${task.taskType}\nTitle: ${task.title}\nDescription: ${task.description}\nRisk: ${task.riskLevel}\nReturn concise production-ready output, actions taken, and verification notes.`;
}

export async function runTask(taskId: string, options: TaskExecutorOptions = {}) {
  if (locks.has(taskId)) return { ok: false, reason: 'Task is already locked by another worker.' };
  locks.add(taskId);
  try {
    const task = (await listTasks()).find((item) => item.id === taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.status === 'cancelled') return { ok: false, reason: 'Task is cancelled.' };
    if (task.requiresApproval) {
      await updateTaskStatus(task.id, 'waiting_approval');
      await writeTaskLog(task.id, 'warn', 'Task paused waiting for approval.');
      return { ok: false, status: 'waiting_approval', reason: 'Approval required.' };
    }
    const permission = checkTaskToolPermissions(task);
    if (!permission.allowed) {
      await updateTaskStatus(task.id, 'failed', permission.reason);
      await writeTaskLog(task.id, 'error', permission.reason ?? 'Permission denied');
      return { ok: false, reason: permission.reason };
    }
    const decision = await evaluatePermission({ permissionLevel: permissionFromTools(task.allowedTools), classification: classifyTaskAction(task.taskType), action: `task.${task.taskType}`, riskLevel: task.riskLevel });
    if (!decision.allowed) {
      await updateTaskStatus(task.id, decision.requiresApproval ? 'waiting_approval' : 'failed', decision.reason);
      await writeTaskLog(task.id, decision.requiresApproval ? 'warn' : 'error', decision.reason ?? 'Permission denied', decision.approval ? { approvalId: decision.approval.id } : undefined);
      return { ok: false, status: decision.requiresApproval ? 'waiting_approval' : 'failed', reason: decision.reason, approval: decision.approval };
    }
    const modelRole = resolveTaskModelRole(task.taskType);
    assertModelRuntimeHealthy(task.taskType, modelRole);
    await updateTaskStatus(task.id, 'running');
    await writeTaskLog(task.id, 'info', `Running task with ${modelRole}`);
    const completion = await privateChatCompletion({ messages: [{ role: 'user', content: taskPrompt(task) }], taskType: task.taskType, modelRole, fetch: options.fetch });
    const output = completion.choices?.[0]?.message?.content ?? 'Task completed.';
    await updateTaskStatus(task.id, 'completed', output);
    await writeTaskLog(task.id, 'info', 'Task completed.', { conversationId: completion.conversationId });
    await writeAudit({ actorType: 'worker', action: 'task.completed', targetType: 'ai_task', targetId: task.id, status: 'ok', metadata: { modelRole, conversationId: completion.conversationId } });
    return { ok: true, taskId: task.id, outputSummary: output, conversationId: completion.conversationId };
  } catch (error) {
    await updateTaskStatus(taskId, 'failed', error instanceof Error ? error.message : String(error)).catch(() => undefined);
    await writeTaskLog(taskId, 'error', error instanceof Error ? error.message : String(error)).catch(() => undefined);
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  } finally {
    locks.delete(taskId);
  }
}

export async function runNextQueuedTask(options: TaskExecutorOptions = {}) {
  const task = (await listTasks()).find((item) => item.status === 'queued');
  if (!task) return { ok: true, idle: true };
  return runTask(task.id, options);
}

export async function retryTask(taskId: string) {
  await updateTaskStatus(taskId, 'queued');
  await writeTaskLog(taskId, 'info', 'Task queued for retry.');
  return { ok: true, taskId, status: 'queued' };
}

export async function cancelTask(taskId: string) {
  await updateTaskStatus(taskId, 'cancelled');
  await writeTaskLog(taskId, 'warn', 'Task cancelled.');
  return { ok: true, taskId, status: 'cancelled' };
}
