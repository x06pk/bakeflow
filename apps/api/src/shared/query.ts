import { z } from 'zod';
export const pageSchema = z.object({
 page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
 search: z.string().max(100).default(''), status: z.string().max(40).optional(),
 sort: z.string().max(40).default('createdAt'), order: z.enum(['asc','desc']).default('desc'),
 categoryId: z.uuid().optional(), productId: z.uuid().optional(), ingredientId: z.uuid().optional(),
 from: z.iso.date().optional(), to: z.iso.date().optional(),
});
export const idSchema = z.object({ id: z.uuid() });
export const amount = z.coerce.number().finite().min(0).max(1000000000);
export const positive = amount.gt(0);
export const units = z.enum(['KG','G','L','ML','UNIT']);
export function pagination(q: z.infer<typeof pageSchema>) { return { skip: (q.page - 1) * q.pageSize, take: q.pageSize }; }
export function result<T>(data: T[], total: number, q: { page: number; pageSize: number }) { return { data, total, page: q.page, pageSize: q.pageSize, pages: Math.ceil(total / q.pageSize) }; }
