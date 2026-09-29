import { afterAll, expect, test } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
const db = new PrismaClient();
afterAll(() => db.$disconnect());
test('database rejects ambiguous lots, negative stock and over-receipt; rollback preserves data', async () => {
  const marker = randomUUID();
  await expect(db.$transaction(async tx => {
    const category = await tx.ingredientCategory.create({ data: { name: marker } });
    const ingredient = await tx.ingredient.create({ data: { name: marker, sku: marker, categoryId: category.id, baseUnit: 'KG' } });
    await tx.inventoryLot.create({ data: { ingredientId: ingredient.id, lotCode: marker, sourceType: 'ADJUSTMENT', manufacturedAt: new Date('2026-01-01'), expiresAt: new Date('2027-01-01'), initialQuantity: 10, remainingQuantity: -1, unitCost: 5 } });
  })).rejects.toThrow();
  expect(await db.ingredient.count({ where: { sku: marker } })).toBe(0);
  await expect(db.inventoryLot.create({ data: { lotCode: marker, sourceType: 'ADJUSTMENT', manufacturedAt: new Date('2026-01-01'), expiresAt: new Date('2027-01-01'), initialQuantity: 10, remainingQuantity: 10, unitCost: 5 } })).rejects.toThrow();
  await expect(db.$transaction(async tx => {
    const user = await tx.user.findUniqueOrThrow({ where: { email: 'admin@bakeflow.demo' } });
    const category = await tx.ingredientCategory.create({ data: { name: marker } });
    const ingredient = await tx.ingredient.create({ data: { name: marker, sku: marker, categoryId: category.id, baseUnit: 'KG' } });
    const supplier = await tx.supplier.create({ data: { legalName: marker, tradeName: marker, cnpj: marker } });
    await tx.purchaseOrder.create({ data: { supplierId: supplier.id, orderNumber: marker, createdBy: user.id, total: 10, items: { create: { ingredientId: ingredient.id, quantity: 10, receivedQuantity: 11, unitPrice: 1 } } } });
  })).rejects.toThrow();
  expect(await db.supplier.count({ where: { cnpj: marker } })).toBe(0);
});
test('recipe version and ingredients are immutable at database level', async () => {
  const marker = randomUUID();
  await expect(db.$transaction(async tx => {
    const category = await tx.productCategory.create({ data: { name: marker } });
    const product = await tx.product.create({ data: { name: marker, sku: marker, categoryId: category.id, unit: 'UNIT', salePrice: 1 } });
    const recipe = await tx.recipe.create({ data: { productId: product.id, name: marker, versions: { create: { version: 1, yieldQuantity: 10 } } }, include: { versions: true } });
    await tx.recipeVersion.update({ where: { id: recipe.versions[0].id }, data: { yieldQuantity: 20 } });
  })).rejects.toThrow();
  expect(await db.product.count({ where: { sku: marker } })).toBe(0);
});
