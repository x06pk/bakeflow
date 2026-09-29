import {test,expect} from 'vitest';
import {randomInt,randomUUID} from 'node:crypto';
import {buildApp} from '../src/app.js';
test('HTTP workflow validates catalog, partial purchase, production, loss and traceability',async()=>{
 const app=await buildApp();try{
 const login=await app.inject({method:'POST',url:'/api/v1/auth/login',payload:{email:'admin@bakeflow.demo',password:process.env.DEMO_PASSWORD}});
 expect(login.statusCode).toBe(200);const headers={authorization:'Bearer '+login.json().accessToken};const key=randomUUID();
 async function create<T>(path:string,payload:unknown){const response=await app.inject({method:'POST',url:'/api/v1'+path,payload:JSON.stringify(payload),headers: {...headers,'content-type':'application/json'}});expect(response.statusCode,response.body).toBeLessThan(300);return response.json<T>();}
 const category=await create<{id:string}>('/categories/ingredient',{name:key});const pc=await create<{id:string}>('/categories/product',{name:key});
 const ingredient=await create<{id:string}>('/ingredients',{name:key,sku:key,baseUnit:'KG',categoryId:category.id,minimumStock:1});
 const product=await create<{id:string}>('/products',{name:key,sku:key,unit:'UNIT',categoryId:pc.id,salePrice:5,minimumStock:5});
 const supplier=await create<{id:string}>('/suppliers',{legalName:key,tradeName:key,cnpj:String(randomInt(10000000,99999999)).padStart(14,'8')});
 const employee=await create<{id:string}>('/employees',{name:key,cpf:String(randomInt(10000000,99999999)).padStart(11,'9'),birthDate:'1990-01-01',hireDate:'2020-01-01',jobTitle:'Padeiro',salary:3000,workSchedule:'Manhã',status:'ACTIVE'});
 const recipe=await create<{versions:{id:string}[]}>('/recipes',{productId:product.id,name:key,yieldQuantity:10,items:[{ingredientId:ingredient.id,quantity:500,unit:'G'}]});
 const purchase=await create<{id:string;items:{id:string}[]}>('/purchases',{supplierId:supplier.id,status:'ORDERED',items:[{ingredientId:ingredient.id,quantity:1,unitPrice:6}]});
 const lot=await create<{id:string}>('/purchases/'+purchase.id+'/receive',{itemId:purchase.items[0].id,quantity:.75,lotCode:key,manufacturedAt:'2026-01-01',expiresAt:'2090-01-01'});
 const order=await create<{id:string}>('/production',{productId:product.id,recipeVersionId:recipe.versions[0].id,plannedQuantity:10,responsibleEmployeeId:employee.id});
 const completed=await create<{totalCost:string;outputLot:{id:string}}>('/production/'+order.id+'/complete',{producedQuantity:10,lotCode:key+'-out',expiresAt:'2090-01-01'});expect(completed.totalCost).toBe('3');
 await create('/losses',{lotId:lot.id,quantity:.1,reason:'DAMAGE',responsibleEmployeeId:employee.id});
 const trace=await app.inject({url:'/api/v1/inventory/lots/'+completed.outputLot.id,headers});expect(trace.statusCode).toBe(200);expect(trace.json().productionOrder.consumptions).toHaveLength(1);expect(trace.json().productionOrder.responsibleEmployee.salary).toBeUndefined();
 const balance=await app.inject({url:'/api/v1/inventory/lots/'+lot.id,headers});expect(balance.json().remainingQuantity).toBe('0.15');
 const invalid=await app.inject({method:'POST',url:'/api/v1/inventory/adjustments/exit',headers,payload:{lotId:lot.id,quantity:.0000001,reason:'Precisão inválida'}});expect(invalid.statusCode).toBe(400);
 }finally{await app.close();}
});
