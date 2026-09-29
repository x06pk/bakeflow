import { PrismaClient } from '@bakeflow/database';
const url = new URL(process.env.DATABASE_URL ?? 'postgresql://localhost/bakeflow');
if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '5');
export const db = new PrismaClient({ datasourceUrl: url.toString() });
