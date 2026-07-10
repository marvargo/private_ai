import { randomUUID } from 'node:crypto';
import { runNextQueuedTask } from './services/taskExecutor.js';
import { checkAutoStop } from './services/sessionSafety.js';
import { writeAudit } from './services/orchestrator.js';

const workerId = process.env.WORKER_ID || `worker-${randomUUID()}`;
const pollIntervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS || 5000);
const autoStopIntervalMs = Number(process.env.AUTO_STOP_CHECK_INTERVAL_MS || 5 * 60 * 1000);
let shuttingDown = false;
let lastAutoStop = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runAutoStopIfDue() {
  const now = Date.now();
  if (now - lastAutoStop < autoStopIntervalMs) return;
  lastAutoStop = now;
  const result = await checkAutoStop();
  await writeAudit({ actorType: 'worker', action: 'worker.auto_stop_check', targetType: 'worker', targetId: workerId, status: 'ok', metadata: result });
}

export async function runWorkerLoop() {
  await writeAudit({ actorType: 'worker', action: 'worker.started', targetType: 'worker', targetId: workerId, status: 'ok' });
  while (!shuttingDown) {
    await runAutoStopIfDue();
    await runNextQueuedTask({ workerId });
    await sleep(pollIntervalMs);
  }
  await writeAudit({ actorType: 'worker', action: 'worker.stopped', targetType: 'worker', targetId: workerId, status: 'ok' });
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    shuttingDown = true;
  });
}

runWorkerLoop().catch(async (error) => {
  await writeAudit({ actorType: 'worker', action: 'worker.crashed', targetType: 'worker', targetId: workerId, status: 'failed', metadata: { message: error instanceof Error ? error.message : String(error) } }).catch(() => undefined);
  process.exit(1);
});
