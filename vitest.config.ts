import { defineConfig } from 'vitest/config';
import { loadEnvFile } from 'node:process';
try { loadEnvFile('.env'); } catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
const testUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!testUrl || !new URL(testUrl).pathname.endsWith('_test')) throw new Error('Testes exigem banco isolado com nome terminado em _test. Configure TEST_DATABASE_URL.');
process.env.DATABASE_URL = testUrl;
export default defineConfig({ test: { include: ['apps/**/test/**/*.test.ts', 'packages/**/test/**/*.test.ts'], testTimeout: 15000 } });
