import {test,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {db} from '../src/shared/database.js';
import {inventoryService} from '../src/modules/inventory/service.js';
import {recordLoss} from '../src/modules/losses/service.js';
test('loss above balance rolls back; valid loss preserves cost and immutable movement',async()=>{
 const key=randomUUID();const user=await db.user.findUniqueOrThrow({where:{email:'admin@bakeflow.demo'}});const category=await db.ingredientCategory.create({data:{name:key}});const ingredient=await db.ingredient.create({data:{name:key,sku:key,categoryId:category.id,baseUnit:'KG'}});const employee=await db.employee.create({data:{name:key,cpf:key,birthDate:new Date('1990-01-01'),hireDate:new Date('2020-01-01'),jobTitle:'Teste',salary:1,workSchedule:'Manhã'}});
 const lot=await inventoryService.entry({itemType:'INGREDIENT',itemId:ingredient.id,quantity:10,unitCost:7,lotCode:key,manufacturedAt:'2020-01-01',expiresAt:'2020-02-01',reason:'Lote vencido para teste'},user.id);
 const input={lotId:lot.id,quantity:11,reason:'EXPIRATION' as const,responsibleEmployeeId:employee.id};
 await expect(recordLoss(input,user.id)).rejects.toMatchObject({code:'INSUFFICIENT_STOCK'});expect(await db.loss.count({where:{lotId:lot.id}})).toBe(0);
 const loss=await recordLoss({...input,quantity:4},user.id);expect(loss.estimatedCost.toString()).toBe('28');
 expect((await db.inventoryLot.findUniqueOrThrow({where:{id:lot.id}})).remainingQuantity.toString()).toBe('6');
 expect(await db.inventoryMovement.count({where:{referenceId:loss.id,movementType:'LOSS'}})).toBe(1);
});
