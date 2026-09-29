import type {FastifyInstance} from 'fastify';
import {db} from '../../shared/database.js';
import {authorize} from '../../middleware/auth.js';
import {today} from '../../shared/transaction.js';
import {inventoryService} from '../inventory/service.js';
import {pageSchema} from '../../shared/query.js';
export async function dashboardRoutes(app:FastifyInstance){app.get('/dashboard',{preHandler:authorize('MANAGER','STOCK','PRODUCTION')},async()=>{
 const at=today(),month=new Date(Date.UTC(at.getUTCFullYear(),at.getUTCMonth(),1)),week=new Date(at.getTime()-6*86400000),end=new Date(at.getTime()+86400000);
 const [todayCount,cost,losses,critical,expiring,recent,days,top]=await Promise.all([
 db.productionOrder.count({where:{status:'COMPLETED',completedAt:{gte:at,lt:end}}}),
 db.productionOrder.aggregate({where:{status:'COMPLETED',completedAt:{gte:month,lt:end}},_sum:{totalCost:true}}),
 db.loss.groupBy({by:['reason'],where:{createdAt:{gte:month,lt:end}},_sum:{estimatedCost:true},_count:{id:true}}),
 inventoryService.balances(pageSchema.parse({status:'LOW',pageSize:5})),
 db.inventoryLot.findMany({where:{remainingQuantity:{gt:0},expiresAt:{lte:new Date(at.getTime()+7*86400000)}},orderBy:{expiresAt:'asc'},take:5,include:{ingredient:{select:{name:true}},product:{select:{name:true}}}}),
 db.productionOrder.findMany({where:{status:'COMPLETED'},orderBy:{completedAt:'desc'},take:5,include:{product:{select:{name:true,unit:true}},outputLot:{select:{id:true,lotCode:true}}}}),
 db.$queryRaw<{day:string;count:bigint}[]>`SELECT to_char("completedAt",'YYYY-MM-DD') AS day,COUNT(*) AS count FROM "ProductionOrder" WHERE status='COMPLETED' AND "completedAt">=${week} AND "completedAt"<${end} GROUP BY day ORDER BY day`,
 db.$queryRaw<{id:string;name:string;unit:string;quantity:string}[]>`SELECT p.id,p.name,p.unit::text,SUM(o."producedQuantity")::text AS quantity FROM "ProductionOrder" o JOIN "Product" p ON p.id=o."productId" WHERE o.status='COMPLETED' AND o."completedAt">=${month} AND o."completedAt"<${end} GROUP BY p.id ORDER BY SUM(o."producedQuantity") DESC LIMIT 5`
 ]);
 return {stats:{productionToday:todayCount,lowStock:critical.total,lossMonth:losses.reduce((s,l)=>s+Number(l._sum.estimatedCost??0),0),productionCost:Number(cost._sum.totalCost??0)},productionDays:Array.from({length:7},(_,i)=>{const day=new Date(week.getTime()+i*86400000).toISOString().slice(0,10);return {day,count:Number(days.find(d=>d.day===day)?.count??0)};}),lossReasons:losses.map(l=>({reason:l.reason,cost:Number(l._sum.estimatedCost??0)})),topProducts:top,critical:critical.data,expiring,recent};
 });}
