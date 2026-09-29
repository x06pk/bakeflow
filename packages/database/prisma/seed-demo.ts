import { PrismaClient, Prisma } from '@prisma/client';
import { hash } from 'argon2';
import { createHash } from 'node:crypto';
const db = new PrismaClient();
const id = (key: string) => { const s=createHash('sha256').update('bakeflow-demo-v1:'+key).digest('hex'); return s.slice(0,8)+'-'+s.slice(8,12)+'-4'+s.slice(13,16)+'-a'+s.slice(17,20)+'-'+s.slice(20,32); };
const anchor = new Date((process.env.DEMO_ANCHOR_DATE ?? new Date().toISOString().slice(0,10))+'T00:00:00Z');
if(Number.isNaN(anchor.getTime()))throw new Error('DEMO_ANCHOR_DATE inválida.');
const day = (offset: number) => new Date(anchor.getTime()+offset*86400000);
const password = process.env.DEMO_PASSWORD;
if(!password||password.length<12)throw new Error('DEMO_PASSWORD deve ter ao menos 12 caracteres.');
const ingredients = [
 ['Farinha de trigo','KG','Farinhas'],['Farinha integral','KG','Farinhas'],['Farinha de centeio','KG','Farinhas'],['Polvilho azedo','KG','Farinhas'],['Fubá','KG','Farinhas'],
 ['Leite integral','L','Laticínios'],['Manteiga','KG','Laticínios'],['Queijo meia cura','KG','Laticínios'],['Fermento biológico seco','KG','Fermentos'],['Fermento químico','KG','Fermentos'],
 ['Sal refinado','KG','Recheios'],['Açúcar refinado','KG','Recheios'],['Açúcar mascavo','KG','Recheios'],['Ovos','UNIT','Recheios'],['Óleo vegetal','L','Recheios'],
 ['Chocolate em gotas','KG','Recheios'],['Cacau em pó','KG','Recheios'],['Doce de leite','KG','Recheios'],['Goiabada','KG','Recheios'],['Coco ralado','KG','Recheios'],
 ['Canela','KG','Recheios'],['Aveia','KG','Farinhas'],['Gergelim','KG','Recheios'],['Presunto','KG','Recheios'],['Muçarela','KG','Laticínios'],
 ['Frango desfiado','KG','Recheios'],['Requeijão','KG','Laticínios'],['Saco de papel','UNIT','Embalagens'],['Caixa para bolo','UNIT','Embalagens'],['Forma de papel','UNIT','Embalagens']
] as const;
const products = [
 ['Pão Francês','Pães',0.85],['Pão Integral','Pães',8.5],['Pão de Centeio','Pães',12],['Pão de Queijo','Pães',3.5],['Broa de Fubá','Pães',4],
 ['Croissant','Pães',9],['Pão de Leite','Pães',3],['Brioche','Pães',5.5],['Bolo de Chocolate','Bolos',32],['Bolo de Coco','Bolos',28],
 ['Bolo de Fubá','Bolos',24],['Sonho de Creme','Doces',7],['Rosca de Canela','Doces',8],['Cookie de Chocolate','Doces',6],
 ['Coxinha de Frango','Salgados',7],['Enrolado de Presunto','Salgados',8],['Empada de Frango','Salgados',8],['Pão de Aveia','Pães',9]
] as const;
const formula = (p:number) => {
 const flour=p===1?1:p===2?2:p===3?3:p===4||p===10?4:0;
 const items=[{i:flour,q:p>=8&&p<=10?12:6},{i:p>=8?9:8,q:.12},{i:p>=8?11:10,q:p>=8?3:.12},{i:6,q:p===5||p===7?2:.6}];
 const special=p===3?7:p===8?16:p===9?19:p===11?17:p===12?20:p===13?15:p===14||p===16?25:p===15?23:p===17?21:5;
 items.push({i:special,q:special===20?.05:1});
 return items;
};
const schedule:{offset:number;p:number;quantity:number;key:string}[]=[];
for(let offset=-89;offset<=0;offset++)for(let slot=0;slot<3;slot++){const p=((offset+90)*3+slot)%products.length;schedule.push({offset,p,quantity:p>=8&&p<=10?12+((offset+90)%4)*3:80+((offset+90+slot)%6)*20,key:offset+':'+slot});}
const needed=ingredients.map(()=>new Prisma.Decimal(0));
for(const order of schedule)for(const item of formula(order.p))needed[item.i]=needed[item.i].plus(new Prisma.Decimal(item.q).mul(order.quantity).div(100));
const roles = [{email:'admin',role:'ADMIN',name:'Administrador'},{email:'gerente',role:'MANAGER',name:'Marina Costa'},{email:'estoque',role:'STOCK',name:'Carlos Souza'},{email:'producao',role:'PRODUCTION',name:'João Ribeiro'},{email:'rh',role:'HR',name:'Ana Martins'}] as const;
try {
 const marker=await db.auditLog.findUnique({where:{id:id('seed-complete')}});
 if(marker){console.info('Demo já instalada; dados existentes preservados.');}
 else {
 const passwordHash=await hash(password);
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(8212026)`;
  if(await tx.auditLog.findUnique({where:{id:id('seed-complete')}}))return;
  for(const user of roles)await tx.user.upsert({where:{email:user.email+'@bakeflow.demo'},create:{id:id('user:'+user.email),email:user.email+'@bakeflow.demo',name:user.name,role:user.role,passwordHash},update:{}});
  const admin=await tx.user.findUniqueOrThrow({where:{email:'admin@bakeflow.demo'}});
  const employeeNames=['João Ribeiro','Beatriz Santos','Lucas Almeida','Carla Ferreira','Pedro Lima','Ana Martins','Marina Costa','Carlos Souza'];
  for(let e=0;e<employeeNames.length;e++)await tx.employee.create({data:{id:id('employee:'+e),name:employeeNames[e],cpf:'9000000'+String(e).padStart(4,'0'),email:'equipe'+e+'@bakeflow.demo',phone:'1190000000'+e,birthDate:new Date('1990-05-12'),hireDate:day(-730-e*90),jobTitle:e<4?'Padeiro':e===4?'Confeiteiro':e===5?'Analista de RH':e===6?'Gerente':'Estoquista',salary:2800+e*300,workSchedule:e<4?'05:00–13:20':'08:00–16:20',status:'ACTIVE'}});
  await tx.employeeVacation.create({data:{id:id('vacation:1'),employeeId:id('employee:1'),startDate:day(5),endDate:day(19),status:'APPROVED',notes:'Férias programadas da equipe de produção.'}});
  await tx.employeeVacation.create({data:{id:id('vacation:2'),employeeId:id('employee:3'),startDate:day(30),endDate:day(44),status:'SCHEDULED'}});
  await tx.employeeAbsence.create({data:{id:id('absence:1'),employeeId:id('employee:4'),date:day(-3),type:'SICK',reason:'Consulta médica',justified:true}});
  for(let i=0;i<ingredients.length;i++){const [name,baseUnit,category]=ingredients[i];const c=await tx.ingredientCategory.upsert({where:{name:category},create:{name:category},update:{}});await tx.ingredient.create({data:{id:id('ingredient:'+i),name,sku:'INS-'+String(i+1).padStart(3,'0'),baseUnit,categoryId:c.id,minimumStock:baseUnit==='UNIT'?100:20,createdAt:day(-90)}});}
  for(let p=0;p<products.length;p++){const [name,category,salePrice]=products[p];const c=await tx.productCategory.upsert({where:{name:category},create:{name:category},update:{}});await tx.product.create({data:{id:id('product:'+p),name,sku:'PRO-'+String(p+1).padStart(3,'0'),categoryId:c.id,unit:'UNIT',salePrice,minimumStock:p>=8&&p<=10?4:20,createdAt:day(-90)}});
   await tx.recipe.create({data:{id:id('recipe:'+p),productId:id('product:'+p),name:'Ficha técnica · '+name,createdAt:day(-90),versions:{create:{id:id('version:'+p),version:1,yieldQuantity:100,createdAt:day(-90),items:{create:formula(p).map(item=>({ingredientId:id('ingredient:'+item.i),quantity:item.q,unit:ingredients[item.i][1]}))}}}}});
  }
  const supplierNames=['Moinho Boa Safra','Laticínios Serra Branca','Distribuidora Sabor & Cia','Grãos da Terra','Embalagens Ponto Certo'];
  for(let s=0;s<5;s++){await tx.supplier.create({data:{id:id('supplier:'+s),legalName:supplierNames[s]+' Ltda.',tradeName:supplierNames[s],cnpj:'80000000000'+String(s).padStart(3,'0'),email:'contato'+s+'@fornecedor.demo',phone:'113000000'+s,createdAt:day(-90)}});}
  const balances:Prisma.Decimal[]=[];const costs:Prisma.Decimal[]=[];
  for(let i=0;i<ingredients.length;i++){const buffer=[1,5,8].includes(i)?1:ingredients[i][1]==='UNIT'?200:40+(i%4)*10;const quantity=needed[i].plus(buffer);const unitCost=new Prisma.Decimal(ingredients[i][1]==='UNIT'?.35:3+(i%9)*2.3);balances[i]=quantity;costs[i]=unitCost;
   const poId=id('initial-po:'+i),itemId=id('initial-item:'+i),lotId=id('ingredient-lot:'+i);
   await tx.purchaseOrder.create({data:{id:poId,supplierId:id('supplier:'+Math.floor(i/6)),orderNumber:'PC-DEMO-'+String(i+1).padStart(3,'0'),status:'RECEIVED',orderedAt:day(-90),expectedAt:day(-90),total:quantity.mul(unitCost),createdBy:admin.id,createdAt:day(-90),items:{create:{id:itemId,ingredientId:id('ingredient:'+i),quantity,unitPrice:unitCost,receivedQuantity:quantity}}}});
   await tx.inventoryLot.create({data:{id:lotId,ingredientId:id('ingredient:'+i),lotCode:'INS-DEMO-'+String(i+1).padStart(3,'0'),sourceType:'PURCHASE',purchaseOrderItemId:itemId,manufacturedAt:day(-95),expiresAt:day(i===6?3:i===7?6:30+(i%5)*10),initialQuantity:quantity,remainingQuantity:quantity,unitCost,createdAt:day(-90)}});
   await tx.inventoryMovement.create({data:{itemType:'INGREDIENT',ingredientId:id('ingredient:'+i),lotId,movementType:'PURCHASE_ENTRY',quantity,referenceType:'PURCHASE',referenceId:poId,reason:'Recebimento inicial da operação demo',createdBy:admin.id,createdAt:day(-90)}});
   await tx.supplierIngredient.create({data:{supplierId:id('supplier:'+Math.floor(i/6)),ingredientId:id('ingredient:'+i),supplierSku:'FOR-'+i,lastPrice:unitCost}});
  }
  for(const [n,order] of schedule.entries()){
   const orderId=id('order:'+order.key),lotId=id('output:'+order.key),productId=id('product:'+order.p),at=new Date(day(order.offset).getTime()+8*3600000+(n%3)*3600000);
   let totalCost=new Prisma.Decimal(0);const consumed=formula(order.p).map(item=>{const quantity=new Prisma.Decimal(item.q).mul(order.quantity).div(100);balances[item.i]=balances[item.i].minus(quantity);totalCost=totalCost.plus(quantity.mul(costs[item.i]));return {i:item.i,quantity};});
   await tx.productionOrder.create({data:{id:orderId,productId,recipeVersionId:id('version:'+order.p),plannedQuantity:order.quantity,producedQuantity:order.quantity,status:'COMPLETED',startedAt:new Date(at.getTime()-3600000),completedAt:at,responsibleEmployeeId:id('employee:'+(n%4)),totalCost,createdAt:at}});
   for(const c of consumed){await tx.productionConsumption.create({data:{productionOrderId:orderId,ingredientId:id('ingredient:'+c.i),inventoryLotId:id('ingredient-lot:'+c.i),quantity:c.quantity,unitCost:costs[c.i]}});await tx.inventoryMovement.create({data:{itemType:'INGREDIENT',ingredientId:id('ingredient:'+c.i),lotId:id('ingredient-lot:'+c.i),movementType:'PRODUCTION_CONSUMPTION',quantity:c.quantity,referenceType:'PRODUCTION',referenceId:orderId,reason:'Consumo por produção',createdBy:admin.id,createdAt:at}});}
   const unitCost=totalCost.div(order.quantity).toDecimalPlaces(6);const lossQuantity=n%7===0?Math.min(3,order.quantity):0;const counterQuantity=order.offset< -1?order.quantity-lossQuantity:Math.floor(order.quantity*.65);const remaining=order.quantity-lossQuantity-counterQuantity;
   await tx.inventoryLot.create({data:{id:lotId,productId,productionOrderId:orderId,lotCode:'PRD-'+day(order.offset).toISOString().slice(0,10).replaceAll('-','')+'-'+(n%3+1),sourceType:'PRODUCTION',manufacturedAt:day(order.offset),expiresAt:day(order.offset+5),initialQuantity:order.quantity,remainingQuantity:remaining,unitCost,createdAt:at}});
   await tx.inventoryMovement.create({data:{itemType:'PRODUCT',productId,lotId,movementType:'PRODUCTION_OUTPUT',quantity:order.quantity,referenceType:'PRODUCTION',referenceId:orderId,reason:'Entrada de produto acabado',createdBy:admin.id,createdAt:at}});
   if(counterQuantity>0)await tx.inventoryMovement.create({data:{itemType:'PRODUCT',productId,lotId,movementType:'ADJUSTMENT_EXIT',quantity:counterQuantity,referenceType:'COUNTER_TRANSFER',referenceId:orderId,reason:'Transferência para balcão — demonstração',createdBy:admin.id,createdAt:new Date(at.getTime()+3600000)}});
   if(lossQuantity){const lossId=id('loss:'+n),reason=(['LEFTOVER','PRODUCTION_ERROR','QUALITY','DAMAGE'] as const)[n%4];await tx.loss.create({data:{id:lossId,itemType:'PRODUCT',productId,lotId,quantity:lossQuantity,reason,estimatedCost:unitCost.mul(lossQuantity),responsibleEmployeeId:id('employee:'+(n%4)),createdAt:new Date(at.getTime()+2*3600000)}});await tx.inventoryMovement.create({data:{itemType:'PRODUCT',productId,lotId,movementType:'LOSS',quantity:lossQuantity,referenceType:'LOSS',referenceId:lossId,reason,createdBy:admin.id,createdAt:new Date(at.getTime()+2*3600000)}});await tx.auditLog.create({data:{userId:admin.id,action:'LOSS_RECORDED',entity:'Loss',entityId:lossId,metadata:{demo:true},createdAt:at}});}
   await tx.auditLog.create({data:{userId:admin.id,action:'PRODUCTION_COMPLETED',entity:'ProductionOrder',entityId:orderId,metadata:{demo:true,totalCost:totalCost.toString()},createdAt:at}});
  }
  for(let i=0;i<ingredients.length;i++)await tx.inventoryLot.update({where:{id:id('ingredient-lot:'+i)},data:{remainingQuantity:balances[i]}});
  const expiredId=id('expired');await tx.inventoryLot.create({data:{id:expiredId,ingredientId:id('ingredient:2'),lotCode:'CEN-DEMO-VENCIDO',sourceType:'ADJUSTMENT',manufacturedAt:day(-100),expiresAt:day(-2),initialQuantity:8,remainingQuantity:8,unitCost:costs[2],createdAt:day(-90)}});await tx.inventoryMovement.create({data:{itemType:'INGREDIENT',ingredientId:id('ingredient:2'),lotId:expiredId,movementType:'ADJUSTMENT_ENTRY',quantity:8,referenceType:'ADJUSTMENT',referenceId:expiredId,reason:'Lote segregado por validade — demonstração',createdBy:admin.id,createdAt:day(-90)}});
  const partial=id('partial-po'),partialItem=id('partial-item'),partialLot=id('partial-lot');await tx.purchaseOrder.create({data:{id:partial,supplierId:id('supplier:0'),orderNumber:'PC-DEMO-PARCIAL',status:'PARTIALLY_RECEIVED',orderedAt:day(-2),expectedAt:day(2),total:500,createdBy:admin.id,createdAt:day(-2),items:{create:{id:partialItem,ingredientId:id('ingredient:0'),quantity:100,receivedQuantity:60,unitPrice:5}}}});await tx.inventoryLot.create({data:{id:partialLot,ingredientId:id('ingredient:0'),purchaseOrderItemId:partialItem,lotCode:'FAR-DEMO-PARCIAL',sourceType:'PURCHASE',manufacturedAt:day(-3),expiresAt:day(90),initialQuantity:60,remainingQuantity:60,unitCost:5,createdAt:day(0)}});await tx.inventoryMovement.create({data:{itemType:'INGREDIENT',ingredientId:id('ingredient:0'),lotId:partialLot,movementType:'PURCHASE_ENTRY',quantity:60,referenceType:'PURCHASE',referenceId:partial,reason:'Recebimento parcial',createdBy:admin.id,createdAt:day(0)}});
  for(let p=0;p<2;p++)await tx.purchaseOrder.create({data:{id:id('pending:'+p),supplierId:id('supplier:'+p),orderNumber:'PC-DEMO-PENDENTE-'+(p+1),status:'ORDERED',orderedAt:day(-1),expectedAt:day(2+p),total:200,createdBy:admin.id,createdAt:day(-1),items:{create:{ingredientId:id('ingredient:'+(p===0?1:5)),quantity:40,unitPrice:5}}}});
  await tx.productionPlan.create({data:{id:id('future-plan'),productionDate:day(1),status:'APPROVED',createdBy:admin.id,items:{create:[{productId:id('product:0'),plannedQuantity:1200},{productId:id('product:1'),plannedQuantity:300}]}}});
  await tx.productionOrder.create({data:{id:id('planned-order'),productId:id('product:5'),recipeVersionId:id('version:5'),plannedQuantity:120,responsibleEmployeeId:id('employee:0'),status:'PLANNED'}});
  await tx.auditLog.create({data:{id:id('seed-complete'),userId:admin.id,action:'DEMO_SEEDED',entity:'Demo',entityId:id('demo'),metadata:{anchor:anchor.toISOString(),productions:schedule.length,version:1}}});
 },{timeout:180000,maxWait:10000});
 console.info('Demo concluída: 30 insumos, 18 produtos, 270 produções em 90 dias. Dados existentes preservados.');
 }
} finally {await db.$disconnect();}
