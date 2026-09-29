import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {hash} from 'argon2';
import {authorize} from '../../middleware/auth.js';
import {db} from '../../shared/database.js';
import {atomic,audit} from '../../shared/transaction.js';
import {AppError} from '../../shared/errors.js';
import {pageSchema,pagination,result,idSchema} from '../../shared/query.js';
const schema=z.object({name:z.string().trim().min(2).max(120),email:z.email().transform(v=>v.toLowerCase()),role:z.enum(['ADMIN','MANAGER','STOCK','PRODUCTION','HR']),active:z.boolean(),password:z.union([z.string().min(12).max(256),z.literal('')]).optional()});
const select={id:true,name:true,email:true,role:true,active:true,createdAt:true};
export async function userRoutes(app:FastifyInstance){const access=authorize();
 app.get('/users',{preHandler:access},async r=>{const q=pageSchema.parse(r.query);const where={OR:[{name:{contains:q.search,mode:'insensitive' as const}},{email:{contains:q.search,mode:'insensitive' as const}}]};const [data,total]=await db.$transaction([db.user.findMany({where,...pagination(q),orderBy:{name:q.order},select}),db.user.count({where})]);return result(data,total,q);});
 app.post('/users',{preHandler:access},async(r,reply)=>{const {password,...body}=schema.parse(r.body);if(!password)throw new AppError(400,'PASSWORD_REQUIRED','Informe uma senha de ao menos 12 caracteres.');const passwordHash=await hash(password);const user=await atomic(async tx=>{const user=await tx.user.create({data:{...body,passwordHash},select});await audit(tx,r.actor.id,'USER_CREATED','User',user.id,{role:user.role});return user;});return reply.code(201).send(user);});
 app.put('/users/:id',{preHandler:access},async r=>{const {id}=idSchema.parse(r.params);const {password,...body}=schema.parse(r.body);const passwordHash=password?await hash(password):undefined;return atomic(async tx=>{
  await tx.$queryRaw`SELECT id FROM "User" WHERE role='ADMIN' ORDER BY id FOR UPDATE`;
  const old=await tx.user.findUniqueOrThrow({where:{id}});
  if(old.role==='ADMIN'&&old.active&&(body.role!=='ADMIN'||!body.active)&&await tx.user.count({where:{role:'ADMIN',active:true}})<=1)throw new AppError(409,'LAST_ADMIN','Mantenha ao menos um administrador ativo.');
  const user=await tx.user.update({where:{id},data:{...body,...(passwordHash?{passwordHash}:{})},select});
  if(passwordHash||old.role!==body.role||!body.active)await tx.refreshSession.updateMany({where:{userId:id,revokedAt:null},data:{revokedAt:new Date()}});
  await audit(tx,r.actor.id,'USER_UPDATED','User',id,{role:body.role,active:body.active});return user;
 });});
}
