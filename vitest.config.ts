import { defineConfig } from 'vitest/config';
import { loadEnvFile } from 'node:process';
try { loadEnvFile('.env'); } catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
export default defineConfig({ test: { testTimeout: 15000 } });
