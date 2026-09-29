import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authorize } from '../../middleware/auth.js';
import { db } from '../../shared/database.js';
import { pageSchema, idSchema, pagination, result } from '../../shared/query.js';
import { catalogService, ingredientSchema, productSchema, recipeSchema, versionSchema } from './service.js';
export async function catalogRoutes(app: FastifyInstance) {
 const read=authorize('MANAGER','STOCK','PRODUCTION'); const write=authorize('MANAGER','STOCK');
 for(const kind of ['ingredients','products'] as const) {
  app.get('/'+kind,{preHandler:read}, async r=>catalogService.list(kind,pageSchema.parse(r.query)));
  app.get('/'+kind+'/:id',{preHandler:read}, async r=>{const {id}=idSchema.parse(r.params);return kind==='ingredients'?db.ingredient.findUniqueOrThrow({where:{id},include:{category:true}}):db.product.findUniqueOrThrow({where:{id},include:{category:true,recipes:{orderBy:{createdAt:'desc'},include:{versions:{orderBy:{version:'desc'},include:{items:{include:{ingredient:true}}}}}}}});});
  app.post('/'+kind,{preHandler:write},async(r,reply)=>{const saved=kind==='ingredients'?await catalogService.saveIngredient(ingredientSchema.parse(r.body)):await catalogService.saveProduct(productSchema.parse(r.body));return reply.code(201).send(saved);});
  app.put('/'+kind+'/:id',{preHandler:write},async r=>{const {id}=idSchema.parse(r.params);return kind==='ingredients'?catalogService.saveIngredient(ingredientSchema.parse(r.body),id):catalogService.saveProduct(productSchema.parse(r.body),id);});
 }
 for(const kind of ['ingredient','product'] as const) {
  app.get('/categories/'+kind,{preHandler:read},async r=>{const q=pageSchema.parse(r.query);const where={name:{contains:q.search,mode:'insensitive' as const}};if(kind==='ingredient'){const [data,total]=await db.$transaction([db.ingredientCategory.findMany({where,...pagination(q),orderBy:{name:'asc'}}),db.ingredientCategory.count({where})]);return result(data,total,q);} const [data,total]=await db.$transaction([db.productCategory.findMany({where,...pagination(q),orderBy:{name:'asc'}}),db.productCategory.count({where})]);return result(data,total,q);});
  app.post('/categories/'+kind,{preHandler:write},async(r,reply)=>{const data=z.object({name:z.string().trim().min(2).max(80)}).parse(r.body);return reply.code(201).send(kind==='ingredient'?await db.ingredientCategory.create({data}):await db.productCategory.create({data}));});
 }
 app.get('/recipes',{preHandler:read},async r=>{const q=pageSchema.parse(r.query);const where={...(q.search?{name:{contains:q.search,mode:'insensitive' as const}}:{}),...(q.productId?{productId:q.productId}:{}),...(q.status==='ACTIVE'?{active:true}:q.status==='INACTIVE'?{active:false}:{})};const [data,total]=await db.$transaction([db.recipe.findMany({where,...pagination(q),orderBy:{createdAt:q.order},include:{product:true,versions:{take:1,orderBy:{version:'desc'},include:{items:{include:{ingredient:true}}}}}}),db.recipe.count({where})]);return result(data,total,q);});
 app.get('/recipes/:id',{preHandler:read},async r=>db.recipe.findUniqueOrThrow({where:idSchema.parse(r.params),include:{product:true,versions:{orderBy:{version:'desc'},include:{items:{include:{ingredient:true}}}}}}));
 app.post('/recipes',{preHandler:write},async(r,reply)=>reply.code(201).send(await catalogService.createRecipe(recipeSchema.parse(r.body))));
 app.post('/recipes/:id/versions',{preHandler:write},async(r,reply)=>reply.code(201).send(await catalogService.version(idSchema.parse(r.params).id,versionSchema.parse(r.body))));
 app.patch('/recipes/:id',{preHandler:write},async r=>db.recipe.update({where:idSchema.parse(r.params),data:z.object({name:z.string().trim().min(2).max(120).optional(),active:z.literal(false).optional()}).parse(r.body)}));
}
