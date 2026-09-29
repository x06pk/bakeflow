import {z} from 'zod';
import {db} from '../../shared/database.js';
import {pageSchema,pagination,result} from '../../shared/query.js';
export const reportSchema=pageSchema.extend({kind:z.enum(['stock','movements','production','losses','cost']).default('stock'),format:z.enum(['json','csv']).default('json')}).refine(q=>!q.from||!q.to||q.from<=q.to,{message:'Período inválido.'});
type Query=z.infer<typeof reportSchema>;
export async function report(q:Query){
 const period={...(q.from?{gte:new Date(q.from)}:{}),...(q.to?{lt:new Date(new Date(q.to).getTime()+86400000)}:{})};
 const owner={...(q.ingredientId?{ingredientId:q.ingredientId}:{}),...(q.productId?{productId:q.productId}:{}),...(q.categoryId?{OR:[{ingredient:{categoryId:q.categoryId}},{product:{categoryId:q.categoryId}}]}:{})};
 if(q.kind==='stock'){
  const where={...owner,...(q.search?{lotCode:{contains:q.search,mode:'insensitive' as const}}:{}),remainingQuantity:{gt:0}};
  const [rows,total]=await db.$transaction([db.inventoryLot.findMany({where,...pagination(q),orderBy:{expiresAt:q.order},include:{ingredient:true,product:true}}),db.inventoryLot.count({where})]);
  return result(rows.map(r=>({id:r.id,Item:r.ingredient?.name??r.product?.name??'',Lote:r.lotCode,Unidade:r.ingredient?.baseUnit??r.product?.unit??'',Saldo:r.remainingQuantity.toString(),Validade:r.expiresAt.toISOString().slice(0,10),'Custo unitário':r.unitCost.toString(),Valor:r.remainingQuantity.mul(r.unitCost).toFixed(2)})),total,q);
 }
 if(q.kind==='movements'){
  const movementType=q.status?z.enum(['PURCHASE_ENTRY','PRODUCTION_CONSUMPTION','PRODUCTION_OUTPUT','LOSS','ADJUSTMENT_ENTRY','ADJUSTMENT_EXIT']).parse(q.status):undefined;
  const where={...owner,createdAt:period,...(movementType?{movementType}:{}),...(q.search?{reason:{contains:q.search,mode:'insensitive' as const}}:{})};
  const [rows,total]=await db.$transaction([db.inventoryMovement.findMany({where,...pagination(q),orderBy:{createdAt:q.order},include:{ingredient:true,product:true,lot:true}}),db.inventoryMovement.count({where})]);
  return result(rows.map(r=>({id:r.id,Data:r.createdAt.toISOString(),Item:r.ingredient?.name??r.product?.name??'',Lote:r.lot.lotCode,Tipo:r.movementType,Quantidade:r.quantity.toString(),Motivo:r.reason})),total,q);
 }
 if(q.kind==='losses'){
  const reason=q.status?z.enum(['EXPIRATION','LEFTOVER','PRODUCTION_ERROR','DAMAGE','QUALITY','OTHER']).parse(q.status):undefined;
  const where={...owner,createdAt:period,...(reason?{reason}:{}),...(q.search?{notes:{contains:q.search,mode:'insensitive' as const}}:{})};
  const [rows,total]=await db.$transaction([db.loss.findMany({where,...pagination(q),orderBy:{createdAt:q.order},include:{ingredient:true,product:true,lot:true}}),db.loss.count({where})]);
  return result(rows.map(r=>({id:r.id,Data:r.createdAt.toISOString(),Item:r.ingredient?.name??r.product?.name??'',Lote:r.lot.lotCode,Motivo:r.reason,Quantidade:r.quantity.toString(),Custo:r.estimatedCost.toFixed(2)})),total,q);
 }
 const status=q.kind==='cost'?'COMPLETED':q.status?z.enum(['PLANNED','IN_PROGRESS','COMPLETED','CANCELLED']).parse(q.status):undefined;
 const where={...(q.productId?{productId:q.productId}:{}),...(q.ingredientId?{consumptions:{some:{ingredientId:q.ingredientId}}}:{}),...(q.categoryId?{product:{categoryId:q.categoryId}}:{}),...(q.from||q.to?{completedAt:period}:{}),...(status?{status}:{}),...(q.search?{product:{name:{contains:q.search,mode:'insensitive' as const},...(q.categoryId?{categoryId:q.categoryId}:{})}}:{})};
 const [rows,total]=await db.$transaction([db.productionOrder.findMany({where,...pagination(q),orderBy:{createdAt:q.order},include:{product:true,recipeVersion:true,outputLot:true}}),db.productionOrder.count({where})]);
 return result(rows.map(r=>({id:r.id,Data:(r.completedAt??r.createdAt).toISOString(),Produto:r.product.name,Lote:r.outputLot?.lotCode??'',Status:r.status,Receita:'v'+r.recipeVersion.version,Quantidade:r.producedQuantity.toString(),Unidade:r.product.unit,Custo:r.totalCost.toFixed(2),'Custo unitário':r.producedQuantity.gt(0)?r.totalCost.div(r.producedQuantity).toFixed(6):'0'})),total,q);
}
export function csvCell(value:unknown){const text=String(value??'');return '"'+(/^[=+\-@\t\r]/.test(text)?"'"+text:text).replaceAll('"','""')+'"';}
