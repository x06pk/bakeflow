import { fileURLToPath } from 'node:url';
try { process.loadEnvFile(fileURLToPath(new URL('../../../.env', import.meta.url))); } catch (error) { if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error; }
const { buildApp } = await import('./app.js');
const app = await buildApp();
await app.listen({ host: '0.0.0.0', port: Number(process.env.PORT ?? 3000) });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, async () => { await app.close(); process.exit(0); });
