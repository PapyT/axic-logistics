import ts from 'typescript';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('work',{recursive:true});
writeFileSync('work/workflow-auth.mjs',"export async function requireOperator(){return null};export async function getOperator(){return {id:'ca5e0003-0000-4000-8000-000000000001',email:'receiver@test.local'}}");
writeFileSync('work/freight.mjs',ts.transpileModule(readFileSync('lib/freight.ts','utf8').replace("'./pricing'","'../lib/pricing.ts'"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const compile=(s)=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
writeFileSync('work/prisma-storage.mjs',compile(readFileSync('lib/prisma-storage.ts','utf8').replace("'./supabase-server'","'../lib/supabase-server.ts'")));
const {createPrismaStorage}=await import('../work/prisma-storage.mjs');
const shipments=new Map(),tickets=new Map();let fail=false;
const model=(rows)=>({
 async findMany(args){if(fail)throw Error('private database password');const result=[...rows.values()];return args?.orderBy?result.sort((a,b)=>b.created-a.created):result},
 async findUnique({where}){return structuredClone(rows.get(where.id)??null)},
 async create({data}){if(fail)throw Error('private database password');if(rows.has(data.id))throw {code:'P2002'};rows.set(data.id,structuredClone(data));return structuredClone(data)},
 async updateManyAndReturn({where,data}){const row=rows.get(where.id);if(!row||where.version!==undefined&&row.version!==where.version)return [];const updated={...row,...data,...(data.version?{version:row.version+data.version.increment}:{})};rows.set(row.id,structuredClone(updated));return [structuredClone(updated)]}
});
globalThis.axicTestStorage=createPrismaStorage({shipment:model(shipments),supportTicket:model(tickets)});
writeFileSync('work/prisma-facade.mjs',"export const storage=globalThis.axicTestStorage;export {StorageError} from '../lib/supabase-server.ts';");
for(const name of ['shipments','support'])writeFileSync(`work/prisma-${name}.mjs`,compile(readFileSync(`app/api/${name}/route.ts`,'utf8').replace("'@/lib/storage-server'","'./prisma-facade.mjs'").replace("'@/lib/freight'","'./freight.mjs'").replace("'@/lib/consignment'","'../lib/consignment.ts'").replace("'@/lib/consignment-server'","'./consignment-server.mjs'").replace("'@/lib/auth-server'","'./workflow-auth.mjs'")));
const api=await import('../work/prisma-shipments.mjs'),support=await import('../work/prisma-support.mjs');
const req=(method,body,id='')=>new Request('https://test.local/api/shipments'+(id?'?id='+id:''),{method,...(body?{body:JSON.stringify(body),headers:{'Content-Type':'application/json'}}:{})});
const data={origin:'Lagos',destination:'Abuja',service:'Road freight',weight:25,length:40,width:30,height:30,insurance:true,customer:'Prisma Demo'};
let r=await api.POST(req('POST',data));assert.equal(r.status,201);const booking=await r.json();
r=await api.PATCH(req('PATCH',{id:booking.id,status:'In transit',location:'Lokoja',driver:'Demo Driver'}));assert.equal(r.status,200);assert.equal((await r.json()).events.length,2);
r=await api.GET(req('GET',null,booking.id));assert.equal((await r.json()).driver,undefined);
// A full dispatch journey must preserve the selected status in customer tracking.
let journeyResponse=await api.POST(req('POST',{...data,customer:'Lifecycle test'}));
const journey=await journeyResponse.json();
for(const [index,status] of ['Collected','In transit','At hub','Out for delivery','Delivered'].entries()){
 const change={id:journey.id,status,location:'Abuja hub',driver:'Demo Driver'};
 let response=await api.PATCH(req('PATCH',change));assert.equal(response.status,200);
 const updated=await response.json();assert.equal(updated.status,status);assert.equal(updated.events.at(-1).label,status);assert.equal(updated.events.length,index+2);
 response=await api.PATCH(req('PATCH',change));assert.equal((await response.json()).events.length,index+2);
 response=await api.GET(req('GET',null,journey.id));assert.equal((await response.json()).status,status);
}
// Driver-only and location-only updates cannot claim a status transition.
let response=await api.PATCH(req('PATCH',{id:booking.id,status:'In transit',location:'Lokoja',driver:'Second Driver'}));
assert.equal((await response.json()).events.at(-1).label,'Driver reassigned');
response=await api.PATCH(req('PATCH',{id:booking.id,status:'In transit',location:'Abuja',driver:'Second Driver'}));
assert.equal((await response.json()).events.at(-1).label,'Location updated');
const legacy={...booking,id:'AX-LEGACY',origin:'Federal Capital Territory',destination:'Lagos',location:'Federal Capital Territory',events:[{status:'Booked',location:'Federal Capital Territory',time:booking.created}]};
await globalThis.axicTestStorage.createShipment(legacy);
response=await api.GET(req('GET',null,legacy.id));const oldTracking=await response.json();assert.equal(oldTracking.origin,'Abuja');assert.equal(oldTracking.location,'Abuja');assert.equal(oldTracking.events[0].location,'Abuja');
response=await api.POST(req('POST',{...data,destination:'Federal Capital Territory'}));assert.equal((await response.json()).destination,'Abuja');
const storage=globalThis.axicTestStorage,old=await storage.getShipment(booking.id);
assert(await storage.updateShipment(old,{...old.payload,status:'At hub'}));assert.equal(await storage.updateShipment(old,old.payload),undefined);
await assert.rejects(()=>storage.createShipment(booking),e=>e.status===409);
r=await api.PATCH(req('PATCH',{id:'AX-204810',status:'Delivered',location:'Abuja',driver:'Demo Driver'}));assert.equal(r.status,404);
await storage.createShipment({...booking,id:'AX-204810'});
r=await api.GET(req('GET'));assert(!(await r.json()).some(s=>s.id==='AX-204810'));
r=await api.GET(req('GET',null,'AX-204810'));assert.equal(r.status,404);
r=await support.POST(req('POST',{subject:'Demo',message:'Prisma support workflow'}));assert.equal(r.status,201);const ticket=await r.json();assert(!Number.isNaN(Date.parse(ticket.created)));
r=await support.PATCH(req('PATCH',{id:ticket.id,status:'Resolved'}));assert.equal((await r.json()).status,'Resolved');
r=await support.GET();assert.equal((await r.json()).length,1);
r=await support.PATCH(req('PATCH',{id:'UNKNOWN',status:'Resolved'}));assert.equal(r.status,404);
fail=true;r=await api.POST(req('POST',data));assert.equal(r.status,503);assert(!(await r.text()).includes('private database'));
delete globalThis.axicTestStorage;
console.log('PASS: Prisma storage and actual API booking→dispatch→tracking, retired sample rejection, ticket resolution, timestamp conversion, complete status progression, no-op saves, edit-specific milestones, legacy Abuja compatibility, atomic stale-update protection, duplicate conflict and sanitized failures (mock Prisma client).');
