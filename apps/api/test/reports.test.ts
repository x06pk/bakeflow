import {test,expect} from 'vitest';
import {buildApp} from '../src/app.js';
import {csvCell} from '../src/modules/reports/service.js';
test('dashboard uses real aggregates; reports paginate and CSV is safe for spreadsheets',async()=>{
 const app=await buildApp();try{
 const login=await app.inject({method:'POST',url:'/api/v1/auth/login',payload:{email:'admin@bakeflow.demo',password:process.env.DEMO_PASSWORD}});
 expect(login.statusCode).toBe(200);const headers={authorization:'Bearer '+login.json().accessToken};
 const dashboard=await app.inject({url:'/api/v1/dashboard',headers});expect(dashboard.statusCode).toBe(200);expect(dashboard.json().productionDays).toHaveLength(7);expect(dashboard.json().stats.productionToday).toBeGreaterThanOrEqual(0);
 const report=await app.inject({url:'/api/v1/reports?kind=production&pageSize=1',headers});expect(report.statusCode).toBe(200);expect(report.json().data.length).toBeLessThanOrEqual(1);
 const csv=await app.inject({url:'/api/v1/reports?kind=stock&format=csv',headers});expect(csv.statusCode).toBe(200);expect(csv.headers['content-type']).toContain('text/csv');
 expect(csvCell('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
 }finally{await app.close();}
});
