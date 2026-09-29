import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { hash, verify } from 'argon2';
import { db } from '../../shared/database.js';
import { AppError } from '../../shared/errors.js';
import { authRepository } from './repository.js';
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const dummyHash = hash(randomBytes(32).toString('hex'));
const safeUser = (user: { id: string; name: string; email: string; role: string }) => ({ id: user.id, name: user.name, email: user.email, role: user.role });
const newSession = (userId: string, familyId: string = randomUUID()) => {
  const token = randomBytes(48).toString('base64url');
  return { token, data: { userId, familyId, tokenHash: digest(token), expiresAt: new Date(Date.now() + 7 * 86400000) } };
};
export const authService = {
  async login(email: string, password: string) {
    const user = await authRepository.findByEmail(email);
    const valid = await verify(user?.passwordHash ?? await dummyHash, password);
    if (!user?.active || !valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha inválidos.');
    const next = newSession(user.id);
    const session = await db.refreshSession.create({ data: next.data });
    return { user: safeUser(user), token: next.token, sessionId: session.id };
  },
  async refresh(token: string | undefined) {
    if (!token) throw new AppError(401, 'INVALID_SESSION', 'Sessão expirada. Entre novamente.');
    const result = await db.$transaction(async tx => {
      const tokenHash = digest(token);
      await tx.$queryRaw`SELECT id FROM "RefreshSession" WHERE "tokenHash" = ${tokenHash} FOR UPDATE`;
      const session = await tx.refreshSession.findUnique({ where: { tokenHash }, include: { user: true } });
      if (!session) return null;
      if (session.revokedAt || session.expiresAt <= new Date() || !session.user.active) {
        await tx.refreshSession.updateMany({ where: { familyId: session.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
        return null;
      }
      await tx.refreshSession.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      const next = newSession(session.userId, session.familyId);
      const created = await tx.refreshSession.create({ data: next.data });
      return { user: safeUser(session.user), token: next.token, sessionId: created.id };
    });
    if (!result) throw new AppError(401, 'INVALID_SESSION', 'Sessão expirada. Entre novamente.');
    return result;
  },
  async logout(token: string | undefined) {
    if (!token) return;
    const session = await db.refreshSession.findUnique({ where: { tokenHash: digest(token) } });
    if (session) await db.refreshSession.updateMany({ where: { familyId: session.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
  },
};
