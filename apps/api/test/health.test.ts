import { expect, test } from 'vitest';
import { buildApp } from '../src/app.js';
test('health and standardized not-found responses', async () => {
  const app = await buildApp();
  try {
    const health = await app.inject('/health');
    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({ status: 'ok', service: 'bakeflow-api' });
    const missing = await app.inject('/missing');
    expect(missing.statusCode).toBe(404);
    expect(missing.json().error.code).toBe('NOT_FOUND');
  } finally { await app.close(); }
});
