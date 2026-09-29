import {test,expect} from '@playwright/test';
test('all V1 pages load from real API and remain usable on mobile',async({page})=>{
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/login');await page.getByLabel('E-mail',{exact:true}).fill('admin@bakeflow.demo');await page.getByLabel('Senha',{exact:true}).fill(process.env.DEMO_PASSWORD!);await page.getByRole('button',{name:'Entrar na plataforma'}).click();await expect(page.getByRole('heading',{name:'Visão geral da operação'})).toBeVisible();
 const routes=[['/ingredients','Insumos'],['/products','Produtos'],['/recipes','Receitas'],['/inventory','Estoque'],['/purchases','Compras'],['/suppliers','Fornecedores'],['/production','Produção'],['/losses','Perdas'],['/employees','Funcionários'],['/people','Férias e ausências'],['/users','Usuários'],['/reports','Relatórios'],['/settings','Configurações']];
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});for(const [path,title]of routes){await page.goto(path);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();await expect(page.getByText('Não foi possível carregar',{exact:true})).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),path+' overflow').toBe(true);}}
 expect(errors).toEqual([]);
});
