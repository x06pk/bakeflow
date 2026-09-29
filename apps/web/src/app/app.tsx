import { Catalog } from '../features/catalog/catalog';
import { Recipes, RecipeDetail } from '../features/catalog/recipes';
import { CatalogDetail } from '../features/catalog/detail';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../features/auth/auth';
import { Login } from '../features/auth/login';
import { Shell } from '../components/layout/shell';
import { Loading } from '../components/feedback/states';
function Account() { const {user}=useAuth(); return <><p className="eyebrow">SUA CONTA</p><h1 className="page-title">Bem-vindo, {user?.name.split(' ')[0]}.</h1><p className="page-description">Seu acesso à operação da Padaria Santa Massa.</p><section className="card mt-8 max-w-xl"><h2 className="font-semibold">Perfil de acesso</h2><dl className="grid grid-cols-2 gap-4 mt-5 text-sm"><dt className="text-muted-foreground">Nome</dt><dd>{user?.name}</dd><dt className="text-muted-foreground">E-mail</dt><dd className="break-all">{user?.email}</dd><dt className="text-muted-foreground">Permissão</dt><dd>{user?.role}</dd></dl></section></>; }
export function App() { const {user,loading}=useAuth(); if(loading)return <main className="p-12"><Loading/></main>; return <Routes><Route path="/login" element={<Login/>}/><Route element={user?<Shell/>:<Navigate to="/login" replace/>}><Route index element={<Account/>}/><Route path="/ingredients" element={<Catalog kind="ingredients"/>}/><Route path="/products" element={<Catalog kind="products"/>}/><Route path="/ingredients/:id" element={<CatalogDetail kind="ingredients"/>}/><Route path="/products/:id" element={<CatalogDetail kind="products"/>}/><Route path="/recipes" element={<Recipes/>}/><Route path="/recipes/:id" element={<RecipeDetail/>}/><Route path="/settings" element={<Account/>}/><Route path="*" element={<section className="card"><h1 className="page-title">Página não encontrada</h1><p className="page-description">Confira o endereço ou volte ao início.</p></section>}/></Route></Routes>; }
