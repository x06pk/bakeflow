import { db } from '../../shared/database.js';
export const authRepository = {
  findByEmail: (email: string) => db.user.findUnique({ where: { email } }),
  session: (id: string) => db.refreshSession.findUnique({ where: { id }, include: { user: true } }),
};
