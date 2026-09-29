import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, post, refreshSession, setToken, type User } from '../../lib/api';
const Auth = createContext<{ user: User | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => Promise<void> } | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
 const [user, setUser] = useState<User | null>(null);
 const [loading, setLoading] = useState(true);
 const client = useQueryClient();
 useEffect(() => { let mounted = true; void refreshSession().then(user => { if (mounted) setUser(user); }).catch(() => {}).finally(() => { if (mounted) setLoading(false); }); const expired = () => { setUser(null); client.clear(); }; window.addEventListener('session-expired', expired); return () => { mounted = false; window.removeEventListener('session-expired', expired); }; }, [client]);
 async function login(email: string, password: string) { const result = await post<{ accessToken: string; user: User }>('/auth/login', { email, password }); setToken(result.accessToken); setUser(result.user); client.clear(); }
 async function logout() { await api('/auth/logout', { method: 'POST' }); setToken(null); setUser(null); client.clear(); }
 return <Auth.Provider value={{ user, loading, login, logout }}>{children}</Auth.Provider>;
}
export function useAuth() { const value = useContext(Auth); if (!value) throw new Error('AuthProvider ausente'); return value; }
