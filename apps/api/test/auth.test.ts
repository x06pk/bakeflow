import { afterAll, beforeAll, expect, test } from 'vitest';
import { hash } from 'argon2';
import { randomUUID } from 'node:crypto';
import { buildApp } from '../src/app.js';
import { db } from '../src/shared/database.js';
import { authorize } from '../src/middleware/auth.js';
const app = await buildApp();
app.get('/test/admin', { preHandler: authorize() }, async () => ({ ok: true }));
const email = `auth-${randomUUID()}@bakeflow.test`;
const password = 'test-password-only-123';
beforeAll(async () => { await db.user.create({ data: { name: 'Teste RH', email, passwordHash: await hash(password), role: 'HR' } }); });
afterAll(async () => {
  const user = await db.user.findUnique({ where: { email } });
  if (user) { await db.refreshSession.deleteMany({ where: { userId: user.id } }); await db.user.delete({ where: { id: user.id } }); }
  await app.close();
});
test('login, RBAC, rotation, replay detection and logout revoke access', async () => {
  const unauthenticated = await app.inject('/api/v1/auth/me');
  expect(unauthenticated.statusCode).toBe(401);
  expect(unauthenticated.json()).toEqual({ error: { code: 'UNAUTHENTICATED', message: 'Entre para continuar.' } });
  expect((await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password: 'wrong' } })).statusCode).toBe(401);
  const login = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
  expect(login.statusCode).toBe(200);
  expect(login.json().user.passwordHash).toBeUndefined();
  const access = login.json().accessToken as string;
  const cookie = login.cookies[0];
  expect(cookie.httpOnly).toBe(true);
  const cookies = { bakeflow_refresh: cookie.value };
  expect((await app.inject({ url: '/api/v1/auth/me', headers: { authorization: `Bearer ${access}` } })).statusCode).toBe(200);
  expect((await app.inject({ url: '/test/admin', headers: { authorization: `Bearer ${access}` } })).statusCode).toBe(403);
  const refresh = await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', cookies });
  expect(refresh.statusCode).toBe(200);
  expect((await app.inject({ url: '/api/v1/auth/me', headers: { authorization: `Bearer ${access}` } })).statusCode).toBe(401);
  expect((await app.inject({ method: 'POST', url: '/api/v1/auth/refresh', cookies })).statusCode).toBe(401);
  expect((await app.inject({ url: '/api/v1/auth/me', headers: { authorization: `Bearer ${refresh.json().accessToken}` } })).statusCode).toBe(401);
  const again = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
  expect((await app.inject({ method: 'POST', url: '/api/v1/auth/logout', cookies: { bakeflow_refresh: again.cookies[0].value } })).statusCode).toBe(204);
  expect((await app.inject({ url: '/api/v1/auth/me', headers: { authorization: `Bearer ${again.json().accessToken}` } })).statusCode).toBe(401);
});
