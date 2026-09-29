import type { FastifyInstance } from 'fastify';
import { authorize } from '../../middleware/auth.js';
import { pageSchema,idSchema } from '../../shared/query.js';
import { db } from '../../shared/database.js';
import { inventoryService,entrySchema,exitSchema } from './service.js';
export async function inventoryRoutes(app:FastifyInstance) {
 const read=authorize('MANAGER','STOCK','PRODUCTION'),write=authorize('MANAGER','STOCK');
 app.get('/inventory',{preHandler:read},r=>inventoryService.balances(pageSchema.parse(r.query)));
 app.get('/inventory/lots',{preHandler:read},r=>inventoryService.lots(pageSchema.parse(r.query)));
 app.get('/inventory/movements',{preHandler:read},r=>inventoryService.movements(pageSchema.parse(r.query)));
 app.get('/inventory/lots/:id',{preHandler:read},r=>db.inventoryLot.findUniqueOrThrow({where:idSchema.parse(r.params),include:{ingredient:true,product:true,purchaseOrderItem:{include:{purchaseOrder:{include:{supplier:true}}}},productionOrder:{include:{responsibleEmployee:{select:{id:true,name:true}},recipeVersion:{include:{recipe:true}},consumptions:{include:{ingredient:true,inventoryLot:true}}}},movements:{orderBy:{createdAt:'desc'},take:100}}}));
 app.post('/inventory/adjustments/entry',{preHandler:write},async(r,reply)=>reply.code(201).send(await inventoryService.entry(entrySchema.parse(r.body),r.actor.id)));
 app.post('/inventory/adjustments/exit',{preHandler:write},async(r,reply)=>reply.code(201).send(await inventoryService.exit(exitSchema.parse(r.body),r.actor.id)));
}
