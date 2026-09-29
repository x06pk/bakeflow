import { Prisma } from '@bakeflow/database';
import { db } from './database.js';
import { setTimeout as delay } from 'node:timers/promises';
import { randomInt } from 'node:crypto';
export async function atomic<T>(work:(tx:Prisma.TransactionClient)=>Promise<T>):Promise<T> {
 for(let attempt=0;;attempt++) { try { return await db.$transaction(work,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,maxWait:10000,timeout:15000}); } catch(error) { if(attempt<5 && error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2034') { await delay(25 * 2 ** attempt + randomInt(25)); continue; } throw error; } }
}
export function audit(tx:Prisma.TransactionClient,userId:string,action:string,entity:string,entityId:string,metadata:Prisma.InputJsonValue={}) { return tx.auditLog.create({data:{userId,action,entity,entityId,metadata}}); }
export function today() { const now=new Date(); return new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())); }
