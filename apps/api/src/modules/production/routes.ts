import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {authorize} from '../../middleware/auth.js';
import {db} from '../../shared/database.js';
import {pageSchema,pagination,result,idSchema} from '../../shared/query.js';
import {productionService,orderSchema,completeSchema,planSchema} from './service.js';
export async function productionRoutes(app:FastifyInstance){
 const access=authorize('MANAGER','PRODUCTION');
 app.get('/production',{preHandler:access},async r=>{const q=pageSchema.parse(r.query);const status=q.status?z.enum(['PLANNED','IN_PROGRESS','COMPLETED','CANCELLED']).parse(q.status):undefined;const where={...(status?{status}:{}),...(q.productId?{productId:q.productId}:{}),...(q.search?{product:{name:{contains:q.search,mode:'insensitive' as const}}}:{})};const [data,total]=await db.$transaction([db.productionOrder.findMany({where,...pagination(q),orderBy:{createdAt:q.order},include:{product:true,responsibleEmployee:{select:{id:true,name:true}},recipeVersion:{select:{id:true,version:true}},outputLot:true}}),db.productionOrder.count({where})]);return result(data,total,q);});
 app.post('/production',{preHandler:access},async(r,reply)=>reply.code(201).send(await productionService.create(orderSchema.parse(r.body))));
 app.post('/production/:id/complete',{preHandler:access},r=>productionService.complete(idSchema.parse(r.params).id,completeSchema.parse(r.body),r.actor.id));
 app.patch('/production/:id/status',{preHandler:access},r=>productionService.status(idSchema.parse(r.params).id,z.object({status:z.enum(['IN_PROGRESS','CANCELLED'])}).parse(r.body).status));
 app.get('/production/people',{preHandler:authorize('MANAGER','STOCK','PRODUCTION','HR')},async r=>{const q=pageSchema.parse(r.query);const where={status:{not:'TERMINATED' as const},name:{contains:q.search,mode:'insensitive' as const}};const [data,total]=await db.$transaction([db.employee.findMany({where,...pagination(q),select:{id:true,name:true},orderBy:{name:'asc'}}),db.employee.count({where})]);return result(data,total,q);});
 app.get('/production/plans',{preHandler:access},async r=>{const q=pageSchema.parse(r.query);const [data,total]=await db.$transaction([db.productionPlan.findMany({...pagination(q),orderBy:{productionDate:'desc'},include:{items:{include:{product:true}}}}),db.productionPlan.count()]);return result(data,total,q);});
 app.post('/production/plans',{preHandler:access},async(r,reply)=>reply.code(201).send(await productionService.plan(planSchema.parse(r.body),r.actor.id)));
 app.post('/production/requirements',{preHandler:access},r=>productionService.requirements(planSchema.parse(r.body)));
}
