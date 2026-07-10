import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { randomUUID } from 'node:crypto';
import Fastify from 'fastify';
import type { FastifyError } from 'fastify';
import { registerAdminAuth } from './middleware/adminAuth.js';
import { registerRoutes } from './routes/index.js';
import { assertProductionReadyEnv, env } from './utils/env.js';
import { maskSecrets, secureErrorResponse } from './utils/security.js';

export async function buildServer() {
  assertProductionReadyEnv();
  const app = Fastify({ logger: true, genReqId: () => randomUUID() });
  await app.register(cors, { origin: [env.APP_URL], credentials: true });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute', keyGenerator: (request) => (request as typeof request & { user?: { id?: string } }).user?.id || request.ip });
  app.addHook('preHandler', async (request) => {
    const user = (request as typeof request & { user?: { id?: string } }).user;
    request.log.info({ requestId: request.id, userId: user?.id, path: request.url }, 'request received');
  });
  app.setErrorHandler((error, request, reply) => {
    const fastifyError = error as FastifyError;
    const statusCode = fastifyError.statusCode || 500;
    request.log.error({ requestId: request.id, error: maskSecrets(fastifyError.message) }, 'request failed');
    reply.status(statusCode).send(secureErrorResponse(request.id, statusCode));
  });
  await registerAdminAuth(app);
  await registerRoutes(app);
  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = await buildServer();
  await app.listen({ host: '0.0.0.0', port: env.PORT });
}
