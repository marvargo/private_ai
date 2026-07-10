import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { registerAdminAuth } from './middleware/adminAuth.js';
import { registerRoutes } from './routes/index.js';
import { env } from './utils/env.js';

export async function buildServer() {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: [env.APP_URL], credentials: true });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  await registerAdminAuth(app);
  await registerRoutes(app);
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildServer();
  await app.listen({ host: '0.0.0.0', port: env.PORT });
}
