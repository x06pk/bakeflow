import {z} from 'zod';
import {atomic,audit} from '../../shared/transaction.js';
import {amount} from '../../shared/query.js';
import {AppError} from '../../shared/errors.js';
export const employeeSchema=z.object({name:z.string().trim().min(2).max(120),cpf:z.string().regex(/^\d{11}$/,'Informe 11 dígitos.'),email:z.union([z.email(),z.literal('')]).optional(),phone:z.string().max(30).optional(),birthDate:z.iso.date(),hireDate:z.iso.date(),terminationDate:z.iso.date().nullable().optional(),jobTitle:z.string().min(2).max(100),salary:amount,workSchedule:z.string().min(2).max(100),status:z.enum(['ACTIVE','ON_LEAVE','VACATION','TERMINATED'])});
export const vacationSchema=z.object({employeeId:z.uuid(),startDate:z.iso.date(),endDate:z.iso.date(),status:z.enum(['SCHEDULED','APPROVED','CANCELLED','COMPLETED']),notes:z.string().max(1000).optional()});
export const absenceSchema=z.object({employeeId:z.uuid(),date:z.iso.date(),type:z.enum(['SICK','PERSONAL','UNJUSTIFIED','OTHER']),reason:z.string().min(3).max(500),justified:z.boolean(),notes:z.string().max(1000).optional()});
export async function saveEmployee(body:z.infer<typeof employeeSchema>,userId:string,id?:string){
 if(body.hireDate<=body.birthDate || (body.terminationDate&&body.terminationDate<body.hireDate) || (body.status==='TERMINATED'&&!body.terminationDate) || (body.status!=='TERMINATED'&&body.terminationDate))throw new AppError(400,'INVALID_DATES','Confira nascimento, admissão, desligamento e status.');
 return atomic(async tx=>{const data={...body,birthDate:new Date(body.birthDate),hireDate:new Date(body.hireDate),terminationDate:body.terminationDate?new Date(body.terminationDate):null};const employee=id?await tx.employee.update({where:{id},data}):await tx.employee.create({data});if(body.status==='TERMINATED')await audit(tx,userId,'EMPLOYEE_TERMINATED','Employee',employee.id);return employee;});
}
export async function saveVacation(body:z.infer<typeof vacationSchema>,id?:string){
 if(body.endDate<body.startDate)throw new AppError(400,'INVALID_DATES','Fim das férias anterior ao início.');
 return atomic(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Employee" WHERE id=${body.employeeId}::uuid FOR UPDATE`;
  const employee=await tx.employee.findUniqueOrThrow({where:{id:body.employeeId}});
  if(employee.status==='TERMINATED')throw new AppError(422,'INACTIVE_EMPLOYEE','Funcionário desligado.');
  if(body.status!=='CANCELLED'&&await tx.employeeVacation.count({where:{employeeId:body.employeeId,...(id?{id:{not:id}}:{}),status:{not:'CANCELLED'},startDate:{lte:new Date(body.endDate)},endDate:{gte:new Date(body.startDate)}}}))throw new AppError(409,'VACATION_OVERLAP','Já existem férias neste período.');
  const data={...body,startDate:new Date(body.startDate),endDate:new Date(body.endDate)};return id?tx.employeeVacation.update({where:{id},data}):tx.employeeVacation.create({data});
 });
}
export async function saveAbsence(body:z.infer<typeof absenceSchema>,id?:string){return atomic(async tx=>{const employee=await tx.employee.findUniqueOrThrow({where:{id:body.employeeId}});if(employee.status==='TERMINATED')throw new AppError(422,'INACTIVE_EMPLOYEE','Funcionário desligado.');const data={...body,date:new Date(body.date)};return id?tx.employeeAbsence.update({where:{id},data}):tx.employeeAbsence.create({data});});}
