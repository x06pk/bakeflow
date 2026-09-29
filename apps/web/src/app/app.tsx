import {lazy,Suspense,type ReactNode} from 'react';
import {Navigate,Route,Routes} from 'react-router-dom';
import {useAuth} from '../features/auth/auth';
import {Login} from '../features/auth/login';
import {Shell} from '../components/layout/shell';
import {Loading,ErrorState} from '../components/feedback/states';
const Dashboard=lazy(()=>import('../features/dashboard/dashboard').then(m=>({default:m.Dashboard})));
const Catalog=lazy(()=>import('../features/catalog/catalog').then(m=>({default:m.Catalog})));
const CatalogDetail=lazy(()=>import('../features/catalog/detail').then(m=>({default:m.CatalogDetail})));
const Recipes=lazy(()=>import('../features/catalog/recipes').then(m=>({default:m.Recipes})));
const RecipeDetail=lazy(()=>import('../features/catalog/recipes').then(m=>({default:m.RecipeDetail})));
const Inventory=lazy(()=>import('../features/inventory/inventory').then(m=>({default:m.Inventory})));
const LotDetail=lazy(()=>import('../features/inventory/inventory').then(m=>({default:m.LotDetail})));
const Purchases=lazy(()=>import('../features/purchases/purchases').then(m=>({default:m.Purchases})));
const PurchaseDetail=lazy(()=>import('../features/purchases/purchases').then(m=>({default:m.PurchaseDetail})));
const Suppliers=lazy(()=>import('../features/purchases/purchases').then(m=>({default:m.Suppliers})));
const Production=lazy(()=>import('../features/production/production').then(m=>({default:m.Production})));
const Losses=lazy(()=>import('../features/losses/losses').then(m=>({default:m.Losses})));
const Employees=lazy(()=>import('../features/employees/employees').then(m=>({default:m.Employees})));
const People=lazy(()=>import('../features/employees/employees').then(m=>({default:m.People})));
const Users=lazy(()=>import('../features/employees/employees').then(m=>({default:m.Users})));
const Reports=lazy(()=>import('../features/reports/reports').then(m=>({default:m.Reports})));
const Settings=lazy(()=>import('../features/settings/settings').then(m=>({default:m.Settings})));
const HrHome=lazy(()=>import('../features/settings/settings').then(m=>({default:m.HrHome})));
function Access({roles,children}:{roles:string[];children:ReactNode}){const {user}=useAuth();return user?.role==='ADMIN'||roles.includes(user?.role??'')?children:<ErrorState error={new Error('Você não tem permissão para acessar esta área.')}/>;}
export function App(){
 const {user,loading}=useAuth();
 if(loading)return <main className="p-12"><Loading/></main>;
 const operation=['MANAGER','STOCK','PRODUCTION'];
 return <Suspense fallback={<main className="p-8"><Loading/></main>}><Routes>
  <Route path="/login" element={<Login/>}/>
  <Route element={user?<Shell/>:<Navigate to="/login" replace/>}>
   <Route index element={user?.role==='HR'?<HrHome/>:<Dashboard/>}/>
   <Route path="/ingredients" element={<Access roles={operation}><Catalog kind="ingredients"/></Access>}/>
   <Route path="/products" element={<Access roles={operation}><Catalog kind="products"/></Access>}/>
   <Route path="/ingredients/:id" element={<Access roles={operation}><CatalogDetail kind="ingredients"/></Access>}/>
   <Route path="/products/:id" element={<Access roles={operation}><CatalogDetail kind="products"/></Access>}/>
   <Route path="/recipes" element={<Access roles={operation}><Recipes/></Access>}/>
   <Route path="/recipes/:id" element={<Access roles={operation}><RecipeDetail/></Access>}/>
   <Route path="/inventory" element={<Access roles={operation}><Inventory/></Access>}/>
   <Route path="/inventory/lots/:id" element={<Access roles={operation}><LotDetail/></Access>}/>
   <Route path="/suppliers" element={<Access roles={['MANAGER','STOCK']}><Suppliers/></Access>}/>
   <Route path="/purchases" element={<Access roles={['MANAGER','STOCK']}><Purchases/></Access>}/>
   <Route path="/purchases/:id" element={<Access roles={['MANAGER','STOCK']}><PurchaseDetail/></Access>}/>
   <Route path="/production" element={<Access roles={['MANAGER','PRODUCTION']}><Production/></Access>}/>
   <Route path="/losses" element={<Access roles={operation}><Losses/></Access>}/>
   <Route path="/employees" element={<Access roles={['HR']}><Employees/></Access>}/>
   <Route path="/people" element={<Access roles={['HR']}><People/></Access>}/>
   <Route path="/users" element={<Access roles={[]}><Users/></Access>}/>
   <Route path="/reports" element={<Access roles={['MANAGER']}><Reports/></Access>}/>
   <Route path="/settings" element={<Settings/>}/>
   <Route path="*" element={<section className="card"><h1 className="page-title">Página não encontrada</h1><p className="page-description">Confira o endereço ou volte ao início.</p></section>}/>
  </Route>
 </Routes></Suspense>;
}
