import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Wheat } from 'lucide-react';
import './style.css';
const client = new QueryClient();
function App() {
  const health = useQuery({ queryKey: ['health'], queryFn: async () => { const response = await fetch('/health'); if (!response.ok) throw new Error('API indisponível'); return response.json() as Promise<{status: string}>; } });
  return <main className="min-h-screen grid place-items-center p-6"><section className="rounded-2xl border border-stone-200 bg-white p-10 shadow-sm max-w-lg"><Wheat className="text-[#B76E2E] mb-6" size={40}/><p className="text-sm tracking-widest text-stone-500">BAKEFLOW</p><h1 className="text-3xl font-semibold mt-3">Gestão que acompanha o seu forno.</h1><p className="mt-4 text-stone-500">Fundação do ambiente operacional da Padaria Santa Massa.</p><p role="status" className="mt-8 text-sm">{health.isPending ? 'Conectando à API…' : health.isError ? 'API indisponível. Verifique o servidor.' : `API: ${health.data.status}`}</p></section></main>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><QueryClientProvider client={client}><BrowserRouter><App/></BrowserRouter></QueryClientProvider></React.StrictMode>);
