import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {receiptLocation} from '../lib/consignment.ts';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
writeFileSync('work/receipts.mjs',compile(readFileSync('app/api/receipts/route.ts','utf8').replace("'@/lib/workflow-server'","'./legacy-workflow.mjs'").replace("'@/lib/operator-scope'","'./operator-scope.mjs'").replace("'@/lib/auth-server'","'./workflow-auth.mjs'").replace("'@/lib/consignment-server'","'./consignment-server.mjs'").replace("'@/lib/consignment'","'../lib/consignment.ts'").replace("'@/lib/supabase-server'","'../lib/supabase-server.ts'")));
const api=await import('../work/receipts.mjs'),{consignments}=await import('../work/consignment-server.mjs');
const id='ca5e0003-0000-4000-8000-000000000005',actor='ca5e0003-0000-4000-8000-000000000001';
assert.deepEqual(receiptLocation('  Abuja   warehouse '),{location:'Abuja warehouse',key:'abuja warehouse'});assert.throws(()=>receiptLocation(''));assert.throws(()=>receiptLocation('x'.repeat(121)));
const response={item:{id,description:'QA carton',receipts:[]},receipt:{location:'Abuja warehouse',received_by:actor},received:1,expected:2,alreadyReceived:false,shipmentStatus:'In transit'};
const req=body=>new Request('https://test.local/api/receipts',{method:'POST',headers:{origin:'https://test.local','Content-Type':'application/json'},body:JSON.stringify(body)});
const originalFetch=globalThis.fetch;let calls=0,status=200;
delete process.env.DATABASE_URL;process.env.SUPABASE_URL='https://receipt-test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_RECEIPT_TEST';
globalThis.fetch=async(url,options)=>{if(new URL(url).pathname.endsWith('/axic_goods'))return Response.json([]);calls++;assert.equal(new URL(url).pathname,'/rest/v1/rpc/axic_receive_good');const body=JSON.parse(options.body);assert.equal(body.p_good,id);assert.equal(body.p_location,'Abuja warehouse');assert.equal(body.p_actor,actor);assert.equal(body.p_actor_name,'receiver@test.local');assert.match(body.p_receipt,/^[\da-f-]{36}$/);assert.equal(options.cache,'no-store');return Response.json(status===200?response:{private:'secret details'},{status});};
for(const code of [id,'AXIC:GOOD:'+id,'https://axic-logistics.vercel.app/operations/scan?code='+id]){const r=await api.POST(req({code,location:' Abuja   warehouse ',received_by:'forged-user',received_by_name:'forged-name'}));assert.equal(r.status,200);assert.deepEqual(await r.json(),response);}
let r=await api.POST(req({code:id,location:''}));assert.equal(r.status,400);assert.equal(calls,3);
r=await api.POST(req({code:'bad',location:'Abuja warehouse'}));assert.equal(r.status,400);assert.equal(calls,3);
status=409;r=await api.POST(req({code:id,location:'Abuja warehouse'}));assert.equal(r.status,409);
status=404;r=await api.POST(req({code:id,location:'Abuja warehouse'}));assert.equal(r.status,404);
status=500;r=await api.POST(req({code:id,location:'Abuja warehouse'}));assert.equal(r.status,503);assert(!JSON.stringify(await r.json()).includes('secret'));
// The Prisma path calls the same transactional SQL function with bound parameters.
writeFileSync('work/unused-prisma.mjs','export function getPrisma(){return globalThis.axicReceiptPrisma}');
let dbFail='';globalThis.axicReceiptPrisma={$queryRaw:async(parts,...values)=>{assert(parts.join('?').includes('public.axic_receive_good'));assert.equal(values[0],id);assert.equal(values[1],'Abuja warehouse');assert.equal(values[2],actor);if(dbFail)throw {code:'P2010',meta:{code:dbFail}};return [{result:response}]}};
process.env.DATABASE_URL='postgresql://TEST_ONLY';assert.deepEqual(await consignments.receive(id,'Abuja warehouse',actor,'receiver@test.local'),response);
for(const [pg,expected] of [['23505',409],['P0002',404],['XX000',503]]){dbFail=pg;await assert.rejects(()=>consignments.receive(id,'Abuja warehouse',actor,'receiver@test.local'),e=>e.status===expected)}
delete process.env.DATABASE_URL;delete globalThis.axicReceiptPrisma;globalThis.fetch=originalFetch;
console.log('PASS: manual/QR receipt API equivalence, trusted operator audit data, location validation, protected and sanitized errors, Prisma bound parameters and REST adapters using the same transactional receipt function.');
