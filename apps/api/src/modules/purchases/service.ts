import { z } from 'zod';
import { Prisma } from '@bakeflow/database';
import { randomUUID } from 'node:crypto';
import { db } from '../../shared/database.js';
import { atomic,audit } from '../../shared/transaction.js';
import { amount,positive } from '../../shared/query.js';
import { AppError } from '../../shared/errors.js';
export const supplierSchema=z.object({legalName:z.string().trim().min(2).max(150),tradeName:z.string().trim().min(2).max(120),cnpj:z.string().regex(/^\d{14}$/,'Informe 14 dígitos.'),email:z.union([z.email(),z.literal('')]).optional(),phone:z.string().max(30).optional(),active:z.boolean().default(true)});
export const purchaseSchema=z.object({supplierId:z.uuid(),status:z.enum(['DRAFT','ORDERED']).default('ORDERED'),expectedAt:z.iso.date().optional(),items:z.array(z.object({ingredientId:z.uuid(),quantity:positive,unitPrice:amount})).min(1).max(100)});
export const receiveSchema=z.object({itemId:z.uuid(),quantity:positive,lotCode:z.string().trim().min(2).max(80),manufacturedAt:z.iso.date(),expiresAt:z.iso.date()});
export const purchaseService={
 async create(body:z.infer<typeof purchaseSchema>,userId:string) {
  return atomic(async tx=>{
   const supplier=await tx.supplier.findUniqueOrThrow({where:{id:body.supplierId}});if(!supplier.active)throw new AppError(422,'INACTIVE_SUPPLIER','Fornecedor inativo.');
   if(new Set(body.items.map(i=>i.ingredientId)).size!==body.items.length)throw new AppError(400,'DUPLICATE_ITEM','Não repita insumos no pedido.');
   for(const item of body.items){const ingredient=await tx.ingredient.findUniqueOrThrow({where:{id:item.ingredientId}});if(!ingredient.active)throw new AppError(422,'INACTIVE_ITEM','Insumo inativo.');}
   const total=body.items.reduce((sum,i)=>sum.plus(new Prisma.Decimal(i.quantity).mul(i.unitPrice)),new Prisma.Decimal(0));
   return tx.purchaseOrder.create({data:{supplierId:body.supplierId,status:body.status,expectedAt:body.expectedAt?new Date(body.expectedAt):null,orderNumber:'PC-'+randomUUID().slice(0,8).toUpperCase(),total,createdBy:userId,items:{create:body.items}},include:{items:true,supplier:true}});
  });
 },
 async receive(id:string,body:z.infer<typeof receiveSchema>,userId:string) {
  if(body.expiresAt<body.manufacturedAt)throw new AppError(400,'INVALID_DATES','Validade anterior à fabricação.');
  return atomic(async tx=>{
   await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id=${id}::uuid FOR UPDATE`;
   const order=await tx.purchaseOrder.findUniqueOrThrow({where:{id},include:{items:true}});
   if(!['ORDERED','PARTIALLY_RECEIVED'].includes(order.status))throw new AppError(409,'INVALID_STATUS','Pedido não permite recebimento neste status.');
   const item=order.items.find(i=>i.id===body.itemId);if(!item)throw new AppError(404,'NOT_FOUND','Item não pertence ao pedido.');
   if(new Prisma.Decimal(body.quantity).gt(item.quantity.minus(item.receivedQuantity)))throw new AppError(422,'EXCESS_RECEIPT','Recebimento acima da quantidade pendente.');
   const lot=await tx.inventoryLot.create({data:{ingredientId:item.ingredientId,purchaseOrderItemId:item.id,lotCode:body.lotCode,sourceType:'PURCHASE',manufacturedAt:new Date(body.manufacturedAt),expiresAt:new Date(body.expiresAt),initialQuantity:body.quantity,remainingQuantity:body.quantity,unitCost:item.unitPrice}});
   await tx.purchaseOrderItem.update({where:{id:item.id},data:{receivedQuantity:{increment:body.quantity}}});
   await tx.inventoryMovement.create({data:{itemType:'INGREDIENT',ingredientId:item.ingredientId,lotId:lot.id,movementType:'PURCHASE_ENTRY',quantity:body.quantity,referenceType:'PURCHASE',referenceId:order.id,reason:'Recebimento '+order.orderNumber,createdBy:userId}});
   await tx.supplierIngredient.upsert({where:{supplierId_ingredientId:{supplierId:order.supplierId,ingredientId:item.ingredientId}},create:{supplierId:order.supplierId,ingredientId:item.ingredientId,lastPrice:item.unitPrice},update:{lastPrice:item.unitPrice}});
   const complete=order.items.every(i=>i.id===item.id?i.receivedQuantity.plus(body.quantity).eq(i.quantity):i.receivedQuantity.eq(i.quantity));
   await tx.purchaseOrder.update({where:{id},data:{status:complete?'RECEIVED':'PARTIALLY_RECEIVED'}});
   await audit(tx,userId,'PURCHASE_RECEIVED','PurchaseOrder',id,{lotId:lot.id,quantity:body.quantity});return lot;
  });
 },
 async status(id:string,status:'ORDERED'|'CANCELLED',userId:string) {
  return atomic(async tx=>{
   await tx.$queryRaw`SELECT id FROM "PurchaseOrder" WHERE id=${id}::uuid FOR UPDATE`;
   const order=await tx.purchaseOrder.findUniqueOrThrow({where:{id}});
   if(status==='ORDERED'?order.status!=='DRAFT':['RECEIVED','CANCELLED'].includes(order.status))throw new AppError(409,'INVALID_STATUS','Transição de status não permitida.');
   const updated=await tx.purchaseOrder.update({where:{id},data:{status}});await audit(tx,userId,status==='CANCELLED'?'PURCHASE_CANCELLED':'PURCHASE_ORDERED','PurchaseOrder',id);return updated;
  });
 },
 detail:(id:string)=>db.purchaseOrder.findUniqueOrThrow({where:{id},include:{supplier:true,items:{include:{ingredient:true,lots:true}}}})
};
