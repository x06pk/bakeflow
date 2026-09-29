import { PrismaClient } from '@prisma/client';
import { hash } from 'argon2';
const db = new PrismaClient();
try {
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12) throw new Error('DEMO_PASSWORD deve ter ao menos 12 caracteres.');
  await db.user.upsert({
    where: { email: 'admin@bakeflow.demo' },
    create: { name: 'Administrador', email: 'admin@bakeflow.demo', role: 'ADMIN', passwordHash: await hash(password) },
    update: {},
  });
  for (const name of ['Farinhas', 'Laticínios', 'Fermentos', 'Recheios', 'Embalagens']) {
    await db.ingredientCategory.upsert({ where: { name }, create: { name }, update: {} });
  }
  for (const name of ['Pães', 'Salgados', 'Bolos', 'Doces']) {
    await db.productCategory.upsert({ where: { name }, create: { name }, update: {} });
  }
  console.info('Seed mínimo concluído. Admin existente preservado.');
} finally { await db.$disconnect(); }
