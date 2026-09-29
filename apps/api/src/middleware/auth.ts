import type { FastifyRequest } from 'fastify';
import type { Role } from '@bakeflow/shared';
import { authRepository } from '../modules/auth/repository.js';
import { AppError } from '../shared/errors.js';
declare module '@fastify/jwt' {
  interface FastifyJWT { payload: { sub: string; sid: string }; user: { sub: string; sid: string } }
}
declare module 'fastify' {
  interface FastifyRequest { actor: { id: string; name: string; email: string; role: Role } }
}
export async function authenticate(request: FastifyRequest) {
  try { await request.jwtVerify(); } catch { throw new AppError(401, 'UNAUTHENTICATED', 'Entre para continuar.'); }
  const session = await authRepository.session(request.user.sid);
  if (!session || session.userId !== request.user.sub || session.revokedAt || session.expiresAt <= new Date() || !session.user.active) {
    throw new AppError(401, 'INVALID_SESSION', 'Sessão expirada. Entre novamente.');
  }
  const { id, name, email, role } = session.user;
  request.actor = { id, name, email, role };
}
export function authorize(...roles: Role[]) {
  return async (request: FastifyRequest) => {
    await authenticate(request);
    if (request.actor.role !== 'ADMIN' && !roles.includes(request.actor.role)) throw new AppError(403, 'FORBIDDEN', 'Você não tem permissão para esta ação.');
  };
}
