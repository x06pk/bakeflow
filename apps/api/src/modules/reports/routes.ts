import type {FastifyInstance} from 'fastify';
import {Readable} from 'node:stream';
import {authorize} from '../../middleware/auth.js';
import {report,reportSchema,csvCell} from './service.js';
export async function reportRoutes(app:FastifyInstance){app.get('/reports',{preHandler:authorize('MANAGER')},async(r,reply)=>{
 const q=reportSchema.parse(r.query);if(q.format==='json')return report(q);
 const first=await report({...q,page:1,pageSize:100});const keys=first.data.length?Object.keys(first.data[0]).filter(k=>k!=='id'):['Resultado'];
 async function* lines(){yield '\uFEFF'+keys.map(csvCell).join(';')+'\r\n';let current=first;for(let page=1;;page++){for(const row of current.data){const record:Record<string,unknown>=row;yield keys.map(k=>csvCell(record[k])).join(';')+'\r\n';}if(page>=current.pages)break;current=await report({...q,page:page+1,pageSize:100});}}
 return reply.header('Content-Type','text/csv; charset=utf-8').header('Content-Disposition',`attachment; filename="bakeflow-${q.kind}.csv"`).send(Readable.from(lines()));
 });}
