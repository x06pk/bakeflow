import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authorize } from '../../middleware/auth.js';
import { db } from '../../shared/database.js';
import { pageSchema,pagination,result,idSchema } from '../../shared/query.js';
import { purchaseService,purchaseSchema,receiveSchema,supplierSchema } from './service.js';
export async function purchaseRoutes(app:FastifyInstance) {
 const access=authorize('MANAGER','STOCK');
 app.get('/suppliers',{preHandler:access},async r=>{const q=pageSchema.parse(r.query);const where={...(q.search?{OR:[{tradeName:{contains:q.search,mode:'insensitive' as const}},{cnpj:{contains:q.search}}]}:{}),...(q.status==='ACTIVE'?{active:true}:q.status==='INACTIVE'?{active:false}:{})};const [data,total]=await db.$transaction([db.supplier.findMany({where,...pagination(q),orderBy:{tradeName:q.order}}),db.supplier.count({where})]);return result(data,total,q);});
 app.post('/suppliers',{preHandler:access},async(r,reply)=>reply.code(201).send(await db.supplier.create({data:supplierSchema.parse(r.body)})));
 app.put('/suppliers/:id',{preHandler:access},r=>db.supplier.update({where:idSchema.parse(r.params),data:supplierSchema.parse(r.body)}));
 app.get('/purchases',{preHandler:access},async r=>{const q=pageSchema.parse(r.query);const status=q.status?z.enum(['DRAFT','ORDERED','PARTIALLY_RECEIVED','RECEIVED','CANCELLED']).parse(q.status):undefined;const where={...(status?{status}:{}),...(q.search?{OR:[{orderNumber:{contains:q.search,mode:'insensitive' as const}},{supplier:{tradeName:{contains:q.search,mode:'insensitive' as const}}}]}:{})};const [data,total]=await db.$transaction([db.purchaseOrder.findMany({where,...pagination(q),orderBy:{orderedAt:q.order},include:{supplier:true}}),db.purchaseOrder.count({where})]);return result(data,total,q);});
 app.get('/purchases/:id',{preHandler:access},r=>purchaseService.detail(idSchema.parse(r.params).id));
 app.post('/purchases',{preHandler:access},async(r,reply)=>reply.code(201).send(await purchaseService.create(purchaseSchema.parse(r.body),r.actor.id)));
 app.post('/purchases/:id/receive',{preHandler:access},async(r,reply)=>reply.code(201).send(await purchaseService.receive(idSchema.parse(r.params).id,receiveSchema.parse(r.body),r.actor.id)));
 app.patch('/purchases/:id/status',{preHandler:access},r=>purchaseService.status(idSchema.parse(r.params).id,z.object({status:z.enum(['ORDERED','CANCELLED'])}).parse(r.body).status,r.actor.id));
}
