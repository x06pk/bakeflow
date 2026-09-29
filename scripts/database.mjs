import { loadEnvFile } from 'node:process';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
try {
  loadEnvFile(resolve(root, '.env'));
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const mode = process.argv[2];
const commands = {
  migrate: ['packages/database/node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'packages/database/prisma/schema.prisma'],
  minimal: ['packages/database/prisma/seed-minimal.ts'],
  demo: ['packages/database/prisma/seed-demo.ts'],
};
if (!(mode in commands)) throw new Error('Comando de banco desconhecido.');
const result = spawnSync(process.execPath, commands[mode], { cwd: root, stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
