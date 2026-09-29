import {z} from 'zod';
import {Prisma} from '@bakeflow/database';
import {atomic,audit} from '../../shared/transaction.js';
import {positive} from '../../shared/query.js';
import {lockLot,takeFromLot} from '../inventory/service.js';
import {AppError} from '../../shared/errors.js';
export const reasons=z.enum(['EXPIRATION','LEFTOVER','PRODUCTION_ERROR','DAMAGE','QUALITY','OTHER']);
export const lossSchema=z.object({lotId:z.uuid(),quantity:positive,reason:reasons,notes:z.string().max(1000).optional(),responsibleEmployeeId:z.uuid()});
export async function recordLoss(body:z.infer<typeof lossSchema>,userId:string){
 return atomic(async tx=>{
  const lot=await lockLot(tx,body.lotId);const employee=await tx.employee.findUniqueOrThrow({where:{id:body.responsibleEmployeeId}});
  if(employee.status==='TERMINATED')throw new AppError(422,'INACTIVE_EMPLOYEE','Responsável desligado.');
  const quantity=new Prisma.Decimal(body.quantity);await takeFromLot(tx,lot.id,quantity);
  const itemType=lot.ingredientId?'INGREDIENT':'PRODUCT';const owner={ingredientId:lot.ingredientId,productId:lot.productId};
  const loss=await tx.loss.create({data:{...body,...owner,itemType,estimatedCost:quantity.mul(lot.unitCost).toDecimalPlaces(6)}});
  await tx.inventoryMovement.create({data:{...owner,itemType,lotId:lot.id,movementType:'LOSS',quantity,referenceType:'LOSS',referenceId:loss.id,reason:body.reason,createdBy:userId}});
  await audit(tx,userId,'LOSS_RECORDED','Loss',loss.id,{lotId:lot.id,quantity:quantity.toString()});return loss;
 });
}
