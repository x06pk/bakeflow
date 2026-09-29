import { Prisma } from '@bakeflow/database';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { db } from '../../shared/database.js';
import { atomic,audit,today } from '../../shared/transaction.js';
import { positive,amount,pageSchema,pagination,result } from '../../shared/query.js';
import { AppError } from '../../shared/errors.js';
export const entrySchema=z.object({itemType:z.enum(['INGREDIENT','PRODUCT']),itemId:z.uuid(),quantity:positive,unitCost:amount,lotCode:z.string().trim().min(2).max(80),manufacturedAt:z.iso.date(),expiresAt:z.iso.date(),reason:z.string().trim().min(5).max(500)});
export const exitSchema=z.object({lotId:z.uuid(),quantity:positive,reason:z.string().trim().min(5).max(500)});
export async function lockLot(tx:Prisma.TransactionClient,id:string) { await tx.$queryRaw`SELECT id FROM "InventoryLot" WHERE id=${id}::uuid FOR UPDATE`;return tx.inventoryLot.findUniqueOrThrow({where:{id}}); }
export async function takeFromLot(tx:Prisma.TransactionClient,id:string,quantity:Prisma.Decimal) {
 const changed=await tx.inventoryLot.updateMany({where:{id,remainingQuantity:{gte:quantity}},data:{remainingQuantity:{decrement:quantity}}});
 if(changed.count!==1) throw new AppError(422,'INSUFFICIENT_STOCK','Estoque insuficiente para realizar a operação.');
}
export async function allocateFefo(tx:Prisma.TransactionClient,ingredientId:string,quantity:Prisma.Decimal,at=today()) {
 await tx.$queryRaw`SELECT id FROM "Ingredient" WHERE id=${ingredientId}::uuid FOR UPDATE`;
 const lots=await tx.inventoryLot.findMany({where:{ingredientId,expiresAt:{gte:at},manufacturedAt:{lte:at},remainingQuantity:{gt:0}},orderBy:[{expiresAt:'asc'},{createdAt:'asc'},{id:'asc'}]});
 let needed=quantity;const allocations:{lotId:string;quantity:Prisma.Decimal;unitCost:Prisma.Decimal}[]=[];
 for(const lot of lots) { const used=Prisma.Decimal.min(needed,lot.remainingQuantity);if(used.gt(0)) allocations.push({lotId:lot.id,quantity:used,unitCost:lot.unitCost});needed=needed.minus(used);if(needed.lte(0))break; }
 if(needed.gt(0))throw new AppError(422,'INSUFFICIENT_STOCK','Estoque insuficiente para realizar a operação.',{ingredientId,missing:needed.toString()});
 return allocations;
}
export const inventoryService={
 async entry(body:z.infer<typeof entrySchema>,userId:string) {
  if(body.expiresAt<body.manufacturedAt)throw new AppError(400,'INVALID_DATES','Validade anterior à fabricação.');
  return atomic(async tx=>{
   const item=body.itemType==='INGREDIENT'?await tx.ingredient.findUniqueOrThrow({where:{id:body.itemId}}):await tx.product.findUniqueOrThrow({where:{id:body.itemId}});
   if(!item.active)throw new AppError(422,'INACTIVE_ITEM','Cadastro inativo.');
   const owner=body.itemType==='INGREDIENT'?{ingredientId:item.id}:{productId:item.id};
   const lot=await tx.inventoryLot.create({data:{...owner,lotCode:body.lotCode,sourceType:'ADJUSTMENT',manufacturedAt:new Date(body.manufacturedAt),expiresAt:new Date(body.expiresAt),initialQuantity:body.quantity,remainingQuantity:body.quantity,unitCost:body.unitCost}});
   await tx.inventoryMovement.create({data:{...owner,itemType:body.itemType,lotId:lot.id,movementType:'ADJUSTMENT_ENTRY',quantity:body.quantity,referenceType:'ADJUSTMENT',referenceId:lot.id,reason:body.reason,createdBy:userId}});
   await audit(tx,userId,'STOCK_ADJUSTMENT','InventoryLot',lot.id,{quantity:body.quantity,reason:body.reason});return lot;
  });
 },
 async exit(body:z.infer<typeof exitSchema>,userId:string) {
  return atomic(async tx=>{
   const lot=await lockLot(tx,body.lotId);await takeFromLot(tx,lot.id,new Prisma.Decimal(body.quantity));
   const movement=await tx.inventoryMovement.create({data:{ingredientId:lot.ingredientId,productId:lot.productId,itemType:lot.ingredientId?'INGREDIENT':'PRODUCT',lotId:lot.id,movementType:'ADJUSTMENT_EXIT',quantity:body.quantity,referenceType:'ADJUSTMENT',referenceId:randomUUID(),reason:body.reason,createdBy:userId}});
   await audit(tx,userId,'STOCK_ADJUSTMENT','InventoryLot',lot.id,{quantity:-body.quantity,reason:body.reason});return movement;
  });
 },
 async lots(q:z.infer<typeof pageSchema>) {
  const at=today();const soon=new Date(at.getTime()+7*86400000);
  const where={...(q.ingredientId?{ingredientId:q.ingredientId}:{}),...(q.productId?{productId:q.productId}:{}),...(q.search?{OR:[{lotCode:{contains:q.search,mode:'insensitive' as const}},{ingredient:{name:{contains:q.search,mode:'insensitive' as const}}},{product:{name:{contains:q.search,mode:'insensitive' as const}}}]}:{}),...(q.status==='EXPIRED'?{expiresAt:{lt:at},remainingQuantity:{gt:0}}:q.status==='EXPIRING'?{expiresAt:{gte:at,lte:soon},remainingQuantity:{gt:0}}:q.status==='AVAILABLE'?{expiresAt:{gte:at},manufacturedAt:{lte:at},remainingQuantity:{gt:0}}:{})};
  const [data,total]=await db.$transaction([db.inventoryLot.findMany({where,...pagination(q),orderBy:{expiresAt:q.order},include:{ingredient:true,product:true}}),db.inventoryLot.count({where})]);return result(data,total,q);
 },
 async movements(q:z.infer<typeof pageSchema>) {
  const where={...(q.ingredientId?{ingredientId:q.ingredientId}:{}),...(q.productId?{productId:q.productId}:{}),...(q.from||q.to?{createdAt:{...(q.from?{gte:new Date(q.from)}:{}),...(q.to?{lt:new Date(new Date(q.to).getTime()+86400000)}:{})}}:{})};
  const [data,total]=await db.$transaction([db.inventoryMovement.findMany({where,...pagination(q),orderBy:{createdAt:q.order},include:{ingredient:true,product:true,lot:true,creator:{select:{name:true}}}}),db.inventoryMovement.count({where})]);return result(data,total,q);
 },
 async balances(q:z.infer<typeof pageSchema>) {
  const filter=Prisma.sql`WHERE name ILIKE ${'%'+q.search+'%'} ${q.status==='LOW'?Prisma.sql`AND usable < minimum`:Prisma.empty}`;
  const cte=Prisma.sql`WITH balances AS (
   SELECT i.id,i.name,i.sku,i."baseUnit"::text AS unit,'INGREDIENT' AS "itemType",i."minimumStock" AS minimum,COALESCE(SUM(l."remainingQuantity"),0) AS total,COALESCE(SUM(l."remainingQuantity") FILTER(WHERE l."expiresAt">=CURRENT_DATE AND l."manufacturedAt"<=CURRENT_DATE),0) AS usable FROM "Ingredient" i LEFT JOIN "InventoryLot" l ON l."ingredientId"=i.id WHERE i.active GROUP BY i.id
   UNION ALL SELECT p.id,p.name,p.sku,p.unit::text,'PRODUCT',p."minimumStock",COALESCE(SUM(l."remainingQuantity"),0),COALESCE(SUM(l."remainingQuantity") FILTER(WHERE l."expiresAt">=CURRENT_DATE AND l."manufacturedAt"<=CURRENT_DATE),0) FROM "Product" p LEFT JOIN "InventoryLot" l ON l."productId"=p.id WHERE p.active GROUP BY p.id
  )`;
  const [data,count]=await db.$transaction([db.$queryRaw<{id:string;name:string;sku:string;unit:string;itemType:string;minimum:Prisma.Decimal;total:Prisma.Decimal;usable:Prisma.Decimal}[]>(Prisma.sql`${cte} SELECT * FROM balances ${filter} ORDER BY name,id LIMIT ${q.pageSize} OFFSET ${(q.page-1)*q.pageSize}`),db.$queryRaw<{total:bigint}[]>(Prisma.sql`${cte} SELECT COUNT(*) AS total FROM balances ${filter}`)]);
  return result(data,Number(count[0].total),q);
 }
};
