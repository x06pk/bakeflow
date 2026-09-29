import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
try {
  const values = process.env;
  for (const line of readFileSync(resolve(root, '.env'), 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match && !values[match[1]]) values[match[1]] = match[2];
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
const mode = process.argv[2];
const commands = {
  migrate: ['packages/database/node_modules/prisma/build/index.js', 'migrate', 'deploy', '--schema', 'packages/database/prisma/schema.prisma'],
  minimal: ['packages/database/prisma/seed-minimal.ts'],
};
if (!(mode in commands)) throw new Error('Comando de banco desconhecido.');
const result = spawnSync(process.execPath, commands[mode], { cwd: root, stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
