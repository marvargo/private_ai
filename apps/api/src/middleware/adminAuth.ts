import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../utils/env.js';

const PUBLIC_ROUTES = new Set(['/health']);

export async function registerAdminAuth(app: FastifyInstance) {
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    if (PUBLIC_ROUTES.has(request.url.split('?')[0])) return;
    if (!env.ADMIN_API_KEY) return;
    const supplied = request.headers['x-admin-api-key'];
    if (supplied !== env.ADMIN_API_KEY) {
      await reply.code(401).send({ ok: false, error: 'Admin API key required' });
    }
  });
}
