import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

export async function buildApp() {
  const app = Fastify({ logger: { redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'] } });
  await app.register(helmet);
  await app.register(cors, { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173' });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  app.get('/health', async () => ({ status: 'ok', service: 'bakeflow-api' }));
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' } }));
  app.setErrorHandler((error, request, reply) => {
    request.log.error(error);
    const status = typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    reply.code(status).send({ error: { code: status >= 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST', message: status >= 500 ? 'Erro inesperado.' : 'Requisição inválida.' } });
  });
  return app;
}
