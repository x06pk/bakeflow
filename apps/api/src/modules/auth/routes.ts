import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authService } from './service.js';
import { authenticate } from '../../middleware/auth.js';
import { AppError } from '../../shared/errors.js';
const cookieName = 'bakeflow_refresh';
const cookieOptions = () => ({ httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'strict' as const, path: '/api/v1/auth', maxAge: 7 * 86400 });
function checkOrigin(request: FastifyRequest) {
  const allowed = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
  if (request.headers.origin && request.headers.origin !== allowed) throw new AppError(403, 'INVALID_ORIGIN', 'Origem não permitida.');
}
export async function authRoutes(app: FastifyInstance) {
  const respond = async (reply: FastifyReply, result: Awaited<ReturnType<typeof authService.login>>) => {
    const accessToken = app.jwt.sign({ sub: result.user.id, sid: result.sessionId }, { expiresIn: '15m' });
    reply.header('Cache-Control', 'no-store').setCookie(cookieName, result.token, cookieOptions());
    return { accessToken, user: result.user };
  };
  app.post('/login', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (request, reply) => {
    checkOrigin(request);
    const body = z.object({ email: z.email().max(254).transform(v => v.toLowerCase()), password: z.string().min(1).max(256) }).parse(request.body);
    return respond(reply, await authService.login(body.email, body.password));
  });
  app.post('/refresh', async (request, reply) => {
    checkOrigin(request);
    try { return await respond(reply, await authService.refresh(request.cookies[cookieName])); }
    catch (error) { reply.clearCookie(cookieName, cookieOptions()); throw error; }
  });
  app.post('/logout', async (request, reply) => {
    checkOrigin(request);
    await authService.logout(request.cookies[cookieName]);
    reply.clearCookie(cookieName, cookieOptions()).code(204);
  });
  app.get('/me', { preHandler: authenticate }, async request => request.actor);
}
