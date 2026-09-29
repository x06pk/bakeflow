import { z } from 'zod';
import { db } from '../../shared/database.js';
import { AppError } from '../../shared/errors.js';
import { amount, positive, units, pageSchema, pagination, result } from '../../shared/query.js';
import { convert } from '../../shared/units.js';
const common = { name: z.string().trim().min(2).max(120), sku: z.string().trim().min(2).max(40), categoryId: z.uuid(), minimumStock: amount.default(0), active: z.boolean().default(true) };
export const ingredientSchema = z.object({ ...common, baseUnit: units });
export const productSchema = z.object({ ...common, unit: units, salePrice: amount });
export const versionSchema = z.object({ yieldQuantity: positive, items: z.array(z.object({ ingredientId: z.uuid(), quantity: positive, unit: units })).min(1).max(100) });
export const recipeSchema = versionSchema.extend({ productId: z.uuid(), name: z.string().trim().min(2).max(120) });
type Query = z.infer<typeof pageSchema>;
export const catalogService = {
 async list(kind: 'ingredients'|'products', q: Query) {
  const where = { ...(q.search ? { OR: [{name:{contains:q.search,mode:'insensitive' as const}},{sku:{contains:q.search,mode:'insensitive' as const}}] } : {}), ...(q.categoryId?{categoryId:q.categoryId}:{}), ...(q.status==='ACTIVE'?{active:true}:q.status==='INACTIVE'?{active:false}:{}) };
  const orderBy = { [(['name','sku','createdAt'].includes(q.sort)?q.sort:'createdAt')]: q.order };
  if(kind==='ingredients') { const [data,total]=await db.$transaction([db.ingredient.findMany({where,...pagination(q),orderBy,include:{category:true}}),db.ingredient.count({where})]); return result(data,total,q); }
  const [data,total]=await db.$transaction([db.product.findMany({where,...pagination(q),orderBy,include:{category:true}}),db.product.count({where})]); return result(data,total,q);
 },
 async saveIngredient(body: z.infer<typeof ingredientSchema>, id?: string) {
  return db.$transaction(async tx=>{
   if(id) {
    await tx.$queryRaw`SELECT id FROM "Ingredient" WHERE id=${id}::uuid FOR UPDATE`;
    const old=await tx.ingredient.findUniqueOrThrow({where:{id},include:{_count:{select:{lots:true,recipeItems:true,purchaseItems:true}}}});
    if(old.baseUnit!==body.baseUnit && Object.values(old._count).some(Boolean)) throw new AppError(409,'UNIT_IN_USE','Unidade não pode mudar após uso em receita, compra ou lote.');
    return tx.ingredient.update({where:{id},data:body});
   }
   return tx.ingredient.create({data:body});
  });
 },
 async saveProduct(body: z.infer<typeof productSchema>, id?: string) {
  if(id) {
   const old=await db.product.findUniqueOrThrow({where:{id},include:{_count:{select:{lots:true,recipes:true}}}});
   if(old.unit!==body.unit && Object.values(old._count).some(Boolean)) throw new AppError(409,'UNIT_IN_USE','Unidade não pode mudar após uso em receita ou lote.');
   return db.product.update({where:{id},data:body});
  }
  return db.product.create({data:body});
 },
 async version(recipeId: string, body: z.infer<typeof versionSchema>) {
  return db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "Recipe" WHERE id=${recipeId}::uuid FOR UPDATE`;
   await tx.recipe.findUniqueOrThrow({where:{id:recipeId}});
   await validateItems(tx,body.items);
   const last=await tx.recipeVersion.aggregate({where:{recipeId},_max:{version:true}});
   return tx.recipeVersion.create({data:{recipeId,version:(last._max.version??0)+1,yieldQuantity:body.yieldQuantity,items:{create:body.items}},include:{items:{include:{ingredient:true}}}});
  });
 },
 async createRecipe(body: z.infer<typeof recipeSchema>) {
  return db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT id FROM "Product" WHERE id=${body.productId}::uuid FOR UPDATE`;
   const product=await tx.product.findUniqueOrThrow({where:{id:body.productId}});
   if(!product.active) throw new AppError(422,'INACTIVE_PRODUCT','Produto inativo.');
   await validateItems(tx,body.items);
   await tx.recipe.updateMany({where:{productId:body.productId,active:true},data:{active:false}});
   return tx.recipe.create({data:{productId:body.productId,name:body.name,versions:{create:{version:1,yieldQuantity:body.yieldQuantity,items:{create:body.items}}}},include:{versions:{include:{items:true}}}});
  });
 },
};
async function validateItems(tx: Parameters<Parameters<typeof db.$transaction>[0]>[0], items: z.infer<typeof versionSchema>['items']) {
 if(new Set(items.map(i=>i.ingredientId)).size!==items.length) throw new AppError(400,'DUPLICATE_INGREDIENT','Não repita insumos na mesma receita.');
 for(const item of items) { const ingredient=await tx.ingredient.findUniqueOrThrow({where:{id:item.ingredientId}}); if(!ingredient.active) throw new AppError(422,'INACTIVE_INGREDIENT','A receita contém insumo inativo.'); convert(item.quantity,item.unit,ingredient.baseUnit); }
}
