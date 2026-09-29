import type {FastifyInstance} from 'fastify';
import {authorize} from '../../middleware/auth.js';
import {db} from '../../shared/database.js';
import {pageSchema,pagination,result,idSchema} from '../../shared/query.js';
import {saveEmployee,saveVacation,saveAbsence,employeeSchema,vacationSchema,absenceSchema} from './service.js';
export async function employeeRoutes(app:FastifyInstance){const access=authorize('HR');
 app.get('/employees',{preHandler:access},async r=>{const q=pageSchema.parse(r.query);const status=q.status?employeeSchema.shape.status.parse(q.status):undefined;const where={name:{contains:q.search,mode:'insensitive' as const},...(status?{status}:{})};const [data,total]=await db.$transaction([db.employee.findMany({where,...pagination(q),orderBy:{name:q.order}}),db.employee.count({where})]);return result(data,total,q);});
 app.post('/employees',{preHandler:access},async(r,reply)=>reply.code(201).send(await saveEmployee(employeeSchema.parse(r.body),r.actor.id)));
 app.put('/employees/:id',{preHandler:access},r=>saveEmployee(employeeSchema.parse(r.body),r.actor.id,idSchema.parse(r.params).id));
 app.get('/vacations',{preHandler:access},async r=>{const q=pageSchema.parse(r.query);const where={employee:{name:{contains:q.search,mode:'insensitive' as const}}};const [data,total]=await db.$transaction([db.employeeVacation.findMany({where,...pagination(q),orderBy:{startDate:q.order},include:{employee:{select:{name:true}}}}),db.employeeVacation.count({where})]);return result(data,total,q);});
 app.post('/vacations',{preHandler:access},async(r,reply)=>reply.code(201).send(await saveVacation(vacationSchema.parse(r.body))));
 app.put('/vacations/:id',{preHandler:access},r=>saveVacation(vacationSchema.parse(r.body),idSchema.parse(r.params).id));
 app.get('/absences',{preHandler:access},async r=>{const q=pageSchema.parse(r.query);const where={employee:{name:{contains:q.search,mode:'insensitive' as const}}};const [data,total]=await db.$transaction([db.employeeAbsence.findMany({where,...pagination(q),orderBy:{date:q.order},include:{employee:{select:{name:true}}}}),db.employeeAbsence.count({where})]);return result(data,total,q);});
 app.post('/absences',{preHandler:access},async(r,reply)=>reply.code(201).send(await saveAbsence(absenceSchema.parse(r.body))));
 app.put('/absences/:id',{preHandler:access},r=>saveAbsence(absenceSchema.parse(r.body),idSchema.parse(r.params).id));
}
