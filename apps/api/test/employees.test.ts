import {test,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {db} from '../src/shared/database.js';
import {saveVacation} from '../src/modules/employees/service.js';
test('vacations reject invalid dates and overlapping schedules',async()=>{
 const key=randomUUID();const employee=await db.employee.create({data:{name:key,cpf:key,birthDate:new Date('1990-01-01'),hireDate:new Date('2020-01-01'),jobTitle:'Padeiro',salary:3000,workSchedule:'Manhã'}});
 const body={employeeId:employee.id,startDate:'2030-01-01',endDate:'2030-01-15',status:'SCHEDULED' as const};
 await saveVacation(body);
 await expect(saveVacation({...body,startDate:'2030-01-10',endDate:'2030-01-20'})).rejects.toMatchObject({code:'VACATION_OVERLAP'});
 await expect(saveVacation({...body,startDate:'2030-02-01'})).rejects.toMatchObject({code:'INVALID_DATES'});
 expect(await db.employeeVacation.count({where:{employeeId:employee.id}})).toBe(1);
});
