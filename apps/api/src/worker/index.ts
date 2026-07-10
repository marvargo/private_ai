import { runNextQueuedTask } from '../services/taskExecutor.js';

const intervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS || 5000);

async function loop() {
  await runNextQueuedTask();
  setTimeout(loop, intervalMs).unref();
}

loop().catch((error) => {
  console.error(JSON.stringify({ level: 'error', message: 'worker crashed', error: error instanceof Error ? error.message : String(error) }));
  process.exit(1);
});
