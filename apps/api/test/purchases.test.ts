import {test,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {db} from '../src/shared/database.js';
import {purchaseService} from '../src/modules/purchases/service.js';
test('partial receipt creates stock and prevents excess; completion preserves exact movement totals',async()=>{
 const key=randomUUID();const category=await db.ingredientCategory.create({data:{name:key}});const ingredient=await db.ingredient.create({data:{name:key,sku:key,categoryId:category.id,baseUnit:'KG'}});const supplier=await db.supplier.create({data:{legalName:key,tradeName:key,cnpj:key}});const user=await db.user.findUniqueOrThrow({where:{email:'admin@bakeflow.demo'}});
 const order=await purchaseService.create({supplierId:supplier.id,status:'ORDERED',items:[{ingredientId:ingredient.id,quantity:100,unitPrice:5}]},user.id);
 const input={itemId:order.items[0].id,quantity:60,lotCode:key+'a',manufacturedAt:'2026-01-01',expiresAt:'2090-01-01'};
 await purchaseService.receive(order.id,input,user.id);
 expect((await purchaseService.detail(order.id)).status).toBe('PARTIALLY_RECEIVED');
 await expect(purchaseService.receive(order.id,{...input,quantity:41,lotCode:key+'bad'},user.id)).rejects.toMatchObject({code:'EXCESS_RECEIPT'});
 await purchaseService.receive(order.id,{...input,quantity:40,lotCode:key+'b'},user.id);
 expect((await purchaseService.detail(order.id)).status).toBe('RECEIVED');
 expect((await db.inventoryMovement.aggregate({where:{referenceId:order.id},_sum:{quantity:true}}))._sum.quantity?.toString()).toBe('100');
 expect(await db.inventoryLot.count({where:{ingredientId:ingredient.id}})).toBe(2);
});
