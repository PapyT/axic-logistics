import ts from 'typescript';
delete process.env.DATABASE_URL;
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('work',{recursive:true});
writeFileSync('work/workflow-auth.mjs',"export async function requireOperator(){return null}");
writeFileSync('work/freight.mjs',ts.transpileModule(readFileSync('lib/freight.ts','utf8').replace("'./pricing'","'../lib/pricing.ts'"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
for(const name of ['shipments','support']){const source=readFileSync(`app/api/${name}/route.ts`,'utf8').replace("'@/lib/storage-server'","'./storage-server.mjs'").replace("'@/lib/freight'","'./freight.mjs'").replace("'@/lib/auth-server'","'./workflow-auth.mjs'");writeFileSync(`work/${name}.mjs`,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText)}
writeFileSync('work/storage-server.mjs',ts.transpileModule(readFileSync('lib/storage-server.ts','utf8').replaceAll("'./supabase-server'","'../lib/supabase-server.ts'"),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
const api=await import('../work/shipments.mjs');const support=await import('../work/support.mjs');const {quote,states,locations}=await import('../work/freight.mjs');
const request=(method,body,url='https://test.local/api/shipments')=>new Request(url,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
const shipmentRows=new Map(),ticketRows=new Map(),calls=[];
const originalFetch=globalThis.fetch;
process.env.SUPABASE_URL='https://unit-test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_UNIT_TEST_ONLY';
globalThis.fetch=async(url,options)=>{
 const u=new URL(url);assert.equal(u.hostname,'unit-test.supabase.co');assert.equal(options.headers.apikey,process.env.SUPABASE_SECRET_KEY);assert.equal(options.headers.Authorization,undefined);assert.equal(options.cache,'no-store');calls.push({url:u.href,method:options.method});
 const map=u.pathname.endsWith('axic_shipments')?shipmentRows:ticketRows;
 let rows=[...map.values()].filter(row=>!u.searchParams.get('id')||row.id===u.searchParams.get('id').slice(3));
 const version=u.searchParams.get('version');if(version)rows=rows.filter(row=>row.version===Number(version.slice(3)));
 if(options.method==='POST'){const b=JSON.parse(options.body);if(map.has(b.id))return Response.json({error:'duplicate'},{status:409});map.set(b.id,structuredClone(b));rows=[b];}
 if(options.method==='PATCH'){const b=JSON.parse(options.body);rows=rows.map(row=>{const r={...row,...b};map.set(r.id,structuredClone(r));return r})}
 return Response.json(rows);
};
const data={origin:'Lagos',destination:'Abuja',service:'Road freight',weight:25,length:40,width:30,height:30,insurance:true,customer:'Test Studio'};
assert.equal(quote(data).total,16894);assert.equal(quote({...data,destination:'Federal Capital Territory'}).total,16894);assert.throws(()=>quote({...data,origin:'Abuja',destination:'Federal Capital Territory'}));assert.equal(states.length,37);assert.equal(new Set(locations).size,locations.length);assert.equal(quote(data).billable,25);assert.equal(quote({...data,weight:1}).billable,7.2);
assert.throws(()=>quote({...data,destination:'Lagos'}));assert.throws(()=>quote({...data,destination:'Canada'}));assert.throws(()=>quote({...data,weight:NaN}));assert.throws(()=>quote({...data,insurance:'yes'}));
let r=await api.GET(request('GET'));assert.equal(r.status,200);assert.equal((await r.json()).length,0);
r=await api.POST(request('POST',data));assert.equal(r.status,201);const booking=await r.json();assert.equal(booking.amount,quote(data).total);
r=await api.GET(request('GET',null,'https://test.local/api/shipments?id='+booking.id));assert.equal((await r.json()).customer,undefined);
r=await api.PATCH(request('PATCH',{id:booking.id,status:'In transit',location:'Lokoja',driver:'Demo Driver'}));assert.equal(r.status,200);assert.equal((await r.json()).events.length,2);
r=await api.GET(request('GET',null,'https://test.local/api/shipments?id='+booking.id));assert.equal((await r.json()).status,'In transit');
r=await api.PATCH(request('PATCH',{id:booking.id,status:'In transit',location:'Lokoja',driver:'Demo Driver'}));assert.equal((await r.json()).events.length,2);
r=await api.PATCH(request('PATCH',{id:'AX-204810',status:'Delivered',location:'Abuja',driver:'Test Driver'}));assert.equal(r.status,404);
r=await api.GET(request('GET',null,'https://test.local/api/shipments?id=AX-204810'));assert.equal(r.status,404);
r=await api.GET(request('GET',null,'https://test.local/api/shipments?id=UNKNOWN'));assert.equal(r.status,404);
r=await api.POST(request('POST',{...data,weight:0}));assert.equal(r.status,400);
r=await api.PATCH(request('PATCH',{id:booking.id,status:'Fake',location:'Here',driver:'Someone'}));assert.equal(r.status,400);
r=await support.POST(request('POST',{subject:'Test enquiry',message:'Demo support request'}));assert.equal(r.status,201);const ticket=await r.json();
r=await support.GET();assert.equal((await r.json()).length,1);
r=await support.PATCH(request('PATCH',{id:ticket.id,status:'Resolved'}));assert.equal(r.status,200);assert.equal((await r.json()).status,'Resolved');
r=await support.POST(request('POST',{subject:'',message:''}));assert.equal(r.status,400);
r=await support.PATCH(request('PATCH',{id:'UNKNOWN',status:'Resolved'}));assert.equal(r.status,404);
const {storage}=await import('../work/storage-server.mjs');const old=await storage.getShipment(booking.id);assert(await storage.updateShipment(old,{...old.payload,status:'At hub'}));assert.equal(await storage.updateShipment(old,{...old.payload,status:'Delivered'}),undefined);
delete process.env.SUPABASE_SECRET_KEY;r=await api.GET(request('GET'));assert.equal(r.status,503);assert(!JSON.stringify(await r.json()).includes('UNIT_TEST'));
process.env.SUPABASE_SECRET_KEY='sb_secret_UNIT_TEST_ONLY';globalThis.fetch=async()=>Response.json({message:'private backend detail'},{status:401});r=await api.POST(request('POST',data));assert.equal(r.status,503);assert(!JSON.stringify(await r.json()).includes('private backend detail'));
globalThis.fetch=originalFetch;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SECRET_KEY;
assert(calls.some(c=>c.url.includes('version=eq.')));
console.log('PASS: quote rules, booking→dispatch→tracking, support workflows, optimistic concurrency, server-only credentials, missing configuration and sanitized backend failures. Tests exercise real REST helper against a mock Data API.');
