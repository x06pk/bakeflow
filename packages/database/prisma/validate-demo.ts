import {PrismaClient} from '@prisma/client';
const db=new PrismaClient();
try{
 const low=await db.$queryRaw`SELECT COUNT(*)::int AS count FROM "Ingredient" i WHERE active AND (SELECT COALESCE(SUM(l."remainingQuantity"),0) FROM "InventoryLot" l WHERE l."ingredientId"=i.id AND l."expiresAt">=CURRENT_DATE)<i."minimumStock"`;
 const mismatch=await db.$queryRaw`SELECT l.id FROM "InventoryLot" l JOIN "InventoryMovement" m ON m."lotId"=l.id GROUP BY l.id HAVING l."remainingQuantity" <> SUM(CASE WHEN m."movementType" IN ('PURCHASE_ENTRY','PRODUCTION_OUTPUT','ADJUSTMENT_ENTRY') THEN m.quantity ELSE -m.quantity END)`;
 const counts={ingredients:await db.ingredient.count(),products:await db.product.count(),productions:await db.productionOrder.count({where:{status:'COMPLETED'}}),lowIngredients:low[0].count,ledgerMismatches:mismatch.length,partial:await db.purchaseOrder.count({where:{status:'PARTIALLY_RECEIVED'}}),users:await db.user.count(),expired:await db.inventoryLot.count({where:{remainingQuantity:{gt:0},expiresAt:{lt:new Date(new Date().toISOString().slice(0,10))}}})};
 console.log(counts);if(counts.ingredients<25||counts.products<15||counts.lowIngredients<3||mismatch.length||counts.partial<1||counts.expired<1)throw new Error('Cenários demo inválidos');
}finally{await db.$disconnect();}
