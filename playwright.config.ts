import { defineConfig } from '@playwright/test';
import { loadEnvFile } from 'node:process';
try { loadEnvFile('.env'); } catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
export default defineConfig({ testDir: './e2e', outputDir: '.cache/test-results', use: { baseURL: process.env.E2E_URL ?? 'http://localhost:5173', channel: process.env.E2E_BROWSER, headless: true, screenshot: 'only-on-failure' } });
