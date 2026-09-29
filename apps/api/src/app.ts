import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { ZodError } from 'zod';
import { Prisma } from '@bakeflow/database';
import { AppError } from './shared/errors.js';
import { authRoutes } from './modules/auth/routes.js';
import { catalogRoutes } from './modules/catalog/routes.js';

export async function buildApp() {
  const app = Fastify({ logger: { redact: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'] } });
  await app.register(helmet);
  await app.register(cors, { origin: process.env.CORS_ORIGIN ?? 'http://localhost:5173', credentials: true });
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error('JWT_SECRET deve ter ao menos 32 caracteres.');
  await app.register(jwt, { secret });
  await app.register(cookie);
  app.get('/health', async () => ({ status: 'ok', service: 'bakeflow-api' }));
  app.setNotFoundHandler((_request, reply) => reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Recurso não encontrado.' } }));
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) return reply.code(error.status).send({ error: { code: error.code, message: error.message, details: error.details } });
    if (error instanceof ZodError) return reply.code(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Confira os campos informados.', details: error.flatten() } });
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') return reply.code(409).send({ error: { code: 'DUPLICATE', message: 'Já existe um registro com estes dados.' } });
      if (error.code === 'P2025') return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Registro não encontrado.' } });
      if (error.code === 'P2003') return reply.code(409).send({ error: { code: 'REFERENCE_CONFLICT', message: 'O registro possui referências inválidas ou está em uso.' } });
    }
    request.log.error({ errorType: error instanceof Error ? error.name : 'Unknown' }, 'Request failed');
    const status = typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
    reply.code(status).send({ error: { code: status >= 500 ? 'INTERNAL_ERROR' : 'INVALID_REQUEST', message: status >= 500 ? 'Erro inesperado.' : 'Requisição inválida.' } });
  });
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(catalogRoutes, { prefix: '/api/v1' });
  return app;
}
