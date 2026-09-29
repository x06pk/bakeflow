import type {FastifyInstance} from 'fastify';
import {authorize} from '../../middleware/auth.js';
import {db} from '../../shared/database.js';
import {pageSchema,pagination,result} from '../../shared/query.js';
import {recordLoss,lossSchema,reasons} from './service.js';
export async function lossRoutes(app:FastifyInstance){const access=authorize('MANAGER','STOCK','PRODUCTION');
 app.get('/losses',{preHandler:access},async r=>{const q=pageSchema.parse(r.query);const where={...(q.status?{reason:reasons.parse(q.status)}:{}),...(q.search?{OR:[{ingredient:{name:{contains:q.search,mode:'insensitive' as const}}},{product:{name:{contains:q.search,mode:'insensitive' as const}}}]}:{})};const [data,total]=await db.$transaction([db.loss.findMany({where,...pagination(q),orderBy:{createdAt:q.order},include:{ingredient:true,product:true,lot:true,responsibleEmployee:{select:{id:true,name:true}}}}),db.loss.count({where})]);return result(data,total,q);});
 app.post('/losses',{preHandler:access},async(r,reply)=>reply.code(201).send(await recordLoss(lossSchema.parse(r.body),r.actor.id)));
}
