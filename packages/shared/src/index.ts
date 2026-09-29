export const roles = ['ADMIN', 'MANAGER', 'STOCK', 'PRODUCTION', 'HR'] as const;
export type Role = typeof roles[number];
export interface ApiError { error: { code: string; message: string; details?: unknown } }
