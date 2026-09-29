import { z } from 'zod';
import { Prisma } from '@bakeflow/database';
import { db } from '../../shared/database.js';
import { positive } from '../../shared/query.js';
import { atomic,audit,today } from '../../shared/transaction.js';
import { convert } from '../../shared/units.js';
import { allocateFefo,takeFromLot } from '../inventory/service.js';
import { AppError } from '../../shared/errors.js';
export const orderSchema=z.object({productId:z.uuid(),recipeVersionId:z.uuid(),plannedQuantity:positive,responsibleEmployeeId:z.uuid()});
export const completeSchema=z.object({producedQuantity:positive,lotCode:z.string().trim().min(2).max(80),expiresAt:z.iso.date()});
export const planSchema=z.object({productionDate:z.iso.date(),items:z.array(z.object({productId:z.uuid(),plannedQuantity:positive})).min(1).max(100)});
export const productionService={
 async create(body:z.infer<typeof orderSchema>) {
  return atomic(async tx=>{
   const version=await tx.recipeVersion.findUniqueOrThrow({where:{id:body.recipeVersionId},include:{recipe:{include:{product:true}}}});
   if(version.recipe.productId!==body.productId||!version.recipe.product.active)throw new AppError(422,'INVALID_RECIPE','Receita incompatível com o produto.');
   const employee=await tx.employee.findUniqueOrThrow({where:{id:body.responsibleEmployeeId}});if(employee.status==='TERMINATED')throw new AppError(422,'INACTIVE_EMPLOYEE','Responsável desligado.');
   return tx.productionOrder.create({data:body});
  });
 },
 async complete(id:string,body:z.infer<typeof completeSchema>,userId:string) {
  const at=today();if(new Date(body.expiresAt)<at)throw new AppError(400,'INVALID_EXPIRATION','A validade não pode ser anterior à produção.');
  return atomic(async tx=>{
   await tx.$queryRaw`SELECT id FROM "ProductionOrder" WHERE id=${id}::uuid FOR UPDATE`;
   const order=await tx.productionOrder.findUniqueOrThrow({where:{id},include:{product:true,responsibleEmployee:true,recipeVersion:{include:{recipe:true,items:{include:{ingredient:true},orderBy:{ingredientId:'asc'}}}}}});
   if(!['PLANNED','IN_PROGRESS'].includes(order.status))throw new AppError(409,'INVALID_STATUS','Produção já concluída ou cancelada.');
   if(!order.product.active||order.recipeVersion.recipe.productId!==order.productId||order.responsibleEmployee.status==='TERMINATED')throw new AppError(422,'INVALID_PRODUCTION','Produto, receita ou responsável inválido.');
   const consumptions:{ingredientId:string;lotId:string;quantity:Prisma.Decimal;unitCost:Prisma.Decimal}[]=[];
   for(const item of order.recipeVersion.items) {
    if(!item.ingredient.active)throw new AppError(422,'INACTIVE_INGREDIENT','Receita contém insumo inativo.');
    const required=convert(item.quantity,item.unit,item.ingredient.baseUnit).mul(body.producedQuantity).div(order.recipeVersion.yieldQuantity).toDecimalPlaces(6,Prisma.Decimal.ROUND_UP);
    const allocations=await allocateFefo(tx,item.ingredientId,required,at);
    consumptions.push(...allocations.map(a=>({...a,ingredientId:item.ingredientId})));
   }
   let totalCost=new Prisma.Decimal(0);
   for(const consumption of consumptions) {
    await takeFromLot(tx,consumption.lotId,consumption.quantity);
    await tx.productionConsumption.create({data:{productionOrderId:id,ingredientId:consumption.ingredientId,inventoryLotId:consumption.lotId,quantity:consumption.quantity,unitCost:consumption.unitCost}});
    await tx.inventoryMovement.create({data:{itemType:'INGREDIENT',ingredientId:consumption.ingredientId,lotId:consumption.lotId,movementType:'PRODUCTION_CONSUMPTION',quantity:consumption.quantity,referenceType:'PRODUCTION',referenceId:id,reason:'Consumo por produção',createdBy:userId}});
    totalCost=totalCost.plus(consumption.quantity.mul(consumption.unitCost));
   }
   totalCost=totalCost.toDecimalPlaces(6);
   const lot=await tx.inventoryLot.create({data:{productId:order.productId,productionOrderId:id,lotCode:body.lotCode,sourceType:'PRODUCTION',manufacturedAt:at,expiresAt:new Date(body.expiresAt),initialQuantity:body.producedQuantity,remainingQuantity:body.producedQuantity,unitCost:totalCost.div(body.producedQuantity).toDecimalPlaces(6)}});
   await tx.inventoryMovement.create({data:{itemType:'PRODUCT',productId:order.productId,lotId:lot.id,movementType:'PRODUCTION_OUTPUT',quantity:body.producedQuantity,referenceType:'PRODUCTION',referenceId:id,reason:'Entrada de produto acabado',createdBy:userId}});
   const completed=await tx.productionOrder.update({where:{id},data:{status:'COMPLETED',producedQuantity:body.producedQuantity,totalCost,startedAt:order.startedAt??new Date(),completedAt:new Date()}});
   await audit(tx,userId,'PRODUCTION_COMPLETED','ProductionOrder',id,{lotId:lot.id,totalCost:totalCost.toString()});return {...completed,outputLot:lot};
  });
 },
 async status(id:string,status:'IN_PROGRESS'|'CANCELLED') {
  return atomic(async tx=>{await tx.$queryRaw`SELECT id FROM "ProductionOrder" WHERE id=${id}::uuid FOR UPDATE`;const order=await tx.productionOrder.findUniqueOrThrow({where:{id}});if(status==='IN_PROGRESS'?order.status!=='PLANNED':!['PLANNED','IN_PROGRESS'].includes(order.status))throw new AppError(409,'INVALID_STATUS','Transição não permitida.');return tx.productionOrder.update({where:{id},data:{status,...(status==='IN_PROGRESS'?{startedAt:new Date()}:{})}});});
 },
 async plan(body:z.infer<typeof planSchema>,userId:string) {
  if(new Set(body.items.map(i=>i.productId)).size!==body.items.length)throw new AppError(400,'DUPLICATE_ITEM','Não repita produtos no plano.');
  await this.requirements(body);
  return db.productionPlan.create({data:{productionDate:new Date(body.productionDate),createdBy:userId,items:{create:body.items}},include:{items:{include:{product:true}}}});
 },
 async requirements(body:z.infer<typeof planSchema>) {
  const needs=new Map<string,{ingredientId:string;name:string;unit:string;required:Prisma.Decimal}>();
  for(const item of body.items) {
   const recipe=await db.recipe.findFirst({where:{productId:item.productId,active:true,product:{active:true}},include:{versions:{take:1,orderBy:{version:'desc'},include:{items:{include:{ingredient:true}}}}}});
   const version=recipe?.versions[0];if(!version)throw new AppError(422,'NO_RECIPE','Produto sem receita ativa.',{productId:item.productId});
   for(const source of version.items){const amount=convert(source.quantity,source.unit,source.ingredient.baseUnit).mul(item.plannedQuantity).div(version.yieldQuantity).toDecimalPlaces(6,Prisma.Decimal.ROUND_UP);const old=needs.get(source.ingredientId);needs.set(source.ingredientId,{ingredientId:source.ingredientId,name:source.ingredient.name,unit:source.ingredient.baseUnit,required:(old?.required??new Prisma.Decimal(0)).plus(amount)});}
  }
  const at=new Date(body.productionDate);const result=[];
  for(const need of needs.values()){const balance=await db.inventoryLot.aggregate({where:{ingredientId:need.ingredientId,expiresAt:{gte:at},manufacturedAt:{lte:at},remainingQuantity:{gt:0}},_sum:{remainingQuantity:true}});const available=balance._sum.remainingQuantity??new Prisma.Decimal(0);result.push({...need,available,missing:Prisma.Decimal.max(0,need.required.minus(available))});}
  return result;
 }
};
