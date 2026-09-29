import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { money, number } from '../../lib/utils';
import { Loading, ErrorState } from '../../components/feedback/states';
import { Badge } from '../../components/data/resource-page';
import type { CatalogItem } from './catalog';
import type { Recipe } from './recipes';
export function CatalogDetail({kind}:{kind:'ingredients'|'products'}) {
 const {id}=useParams();const query=useQuery({queryKey:[kind,id],queryFn:()=>api<CatalogItem&{recipes?:Recipe[]}>('/'+kind+'/'+id)});
 if(query.isPending)return <Loading/>;if(query.isError)return <ErrorState error={query.error}/>;const item=query.data;
 return <><Link className="text-sm text-muted-foreground" to={'/'+kind}>← Voltar ao catálogo</Link><h1 className="page-title mt-5">{item.name}</h1><p className="page-description">{item.sku} · {item.category.name}</p><div className="grid md:grid-cols-3 gap-5 mt-8"><section className="card"><p className="text-sm text-muted-foreground">Status</p><div className="mt-3"><Badge tone={item.active?'success':'neutral'}>{item.active?'Ativo':'Inativo'}</Badge></div></section><section className="card"><p className="text-sm text-muted-foreground">Estoque mínimo</p><p className="text-2xl font-semibold mt-2">{number(item.minimumStock)} {item.baseUnit??item.unit}</p></section><section className="card"><p className="text-sm text-muted-foreground">{kind==='products'?'Preço de venda':'Unidade-base'}</p><p className="text-2xl font-semibold mt-2">{kind==='products'?money(item.salePrice):item.baseUnit}</p></section></div>{kind==='products'&&<section className="card mt-5"><h2 className="font-semibold mb-4">Fichas técnicas</h2>{item.recipes?.length?item.recipes.map(r=><Link key={r.id} to={'/recipes/'+r.id} className="flex justify-between py-3 border-b"><span>{r.name}</span><Badge tone={r.active?'success':'neutral'}>{r.active?'Ativa':'Histórica'}</Badge></Link>):<p className="text-sm text-muted-foreground">Nenhuma receita cadastrada para este produto.</p>}</section>}</>;
}
