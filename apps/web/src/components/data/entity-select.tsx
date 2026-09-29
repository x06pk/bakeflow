import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Page } from './resource-page';
export function EntitySelect({endpoint,value,onChange,label}:{endpoint:string;value:string;onChange:(value:string)=>void;label:string}) {
 const [search,setSearch]=useState('');
 const query=useQuery({queryKey:[endpoint,'options',search],queryFn:()=>api<Page<{id:string;name?:string;tradeName?:string;sku?:string}>>(`${endpoint}${endpoint.includes('?')?'&':'?'}pageSize=30&search=${encodeURIComponent(search)}`)});
 return <div className="field"><label>{label}<input aria-label={`Buscar ${label}`} placeholder="Digite para localizar…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select aria-label={label} required value={value} onChange={e=>onChange(e.target.value)}><option value="">{query.isPending?'Carregando…':'Selecione'}</option>{value&&!query.data?.data.some(i=>i.id===value)&&<option value={value}>Selecionado</option>}{query.data?.data.map(i=><option key={i.id} value={i.id}>{i.name??i.tradeName}{i.sku?' · '+i.sku:''}</option>)}</select>{query.isError&&<small role="alert" className="text-red-500">{query.error.message}</small>}<small className="text-muted-foreground font-normal">Até 30 resultados. Refine a busca se necessário.</small></div>;
}
