export interface User { id: string; name: string; email: string; role: string }
export class ApiError extends Error { constructor(message: string, public status: number, public code: string) { super(message); } }
let accessToken: string | null = null;
let refreshPromise: Promise<User | null> | null = null;
export function setToken(token: string | null) { accessToken = token; }
export async function refreshSession(): Promise<User | null> {
  if (!refreshPromise) refreshPromise = fetch('/api/v1/auth/refresh', { method: 'POST', credentials: 'include' }).then(async response => {
    if (!response.ok) { accessToken = null; return null; }
    const result = await response.json(); accessToken = result.accessToken; return result.user as User;
  }).finally(() => { refreshPromise = null; });
  return refreshPromise;
}
export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch('/api/v1' + path, { ...init, credentials: 'include', headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(accessToken ? { Authorization: 'Bearer ' + accessToken } : {}), ...init.headers } });
  if (response.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await refreshSession()) return api<T>(path, init, false);
    window.dispatchEvent(new Event('session-expired'));
  }
  if (!response.ok) { const result = await response.json().catch(() => ({})); throw new ApiError(result.error?.message ?? 'Não foi possível concluir a operação.', response.status, result.error?.code ?? 'ERROR'); }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export const post = <T,>(path: string, data: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(data) });
