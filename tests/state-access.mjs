import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const actor='ca5e0005-0000-4000-8000-000000000001',good='ca5e0005-0000-4000-8000-000000000002';
writeFileSync('work/scoped-auth.mjs',`export async function getOperator(){return globalThis.axicScopeUser}export async function requireOperator(req){if(req&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origin'},{status:403});if(!globalThis.axicScopeUser)return Response.json({error:'Login'},{status:401});return null}export async function requireAdmin(req){const denied=await requireOperator(req);if(denied)return denied;if(globalThis.axicScopeUser.axicRole!=='admin')return Response.json({error:'Admin'},{status:403});return null}`);
for(const name of ['shipments','consignments','goods','support','receipts','quote-requests'])writeFileSync(`work/scoped-${name}.mjs`,compile(readFileSync(`app/api/${name}/route.ts`,'utf8').replace("'@/lib/auth-server'","'./scoped-auth.mjs'").replace("'@/lib/operator-scope'","'./operator-scope.mjs'").replace("'@/lib/storage-server'","'./storage-server.mjs'").replace("'@/lib/consignment-server'","'./consignment-server.mjs'").replace("'@/lib/consignment'","'../lib/consignment.ts'").replace("'@/lib/workflow-server'","'./legacy-workflow.mjs'").replace("'@/lib/supabase-server'","'../lib/supabase-server.ts'").replace("'@/lib/freight'","'./freight.mjs'").replace("'@/lib/quote-request-server'","'./quote-requests-server.mjs'")));
writeFileSync('work/quote-requests-server.mjs',compile(readFileSync('lib/quote-request-server.ts','utf8').replace("'./supabase-server'","'../lib/supabase-server.ts'").replace("'./prisma-server'","'./quote-prisma.mjs'")));
const shipment=await import('../work/scoped-shipments.mjs'),consignment=await import('../work/scoped-consignments.mjs'),goods=await import('../work/scoped-goods.mjs'),support=await import('../work/scoped-support.mjs'),receipts=await import('../work/scoped-receipts.mjs'),quotes=await import('../work/scoped-quote-requests.mjs');
const row=(id,origin,destination)=>({id,version:0,payload:{id,origin,destination,status:'Booked',location:origin,created:'2026-10-10',events:[],sender:{name:'Private sender'}}});const rows=[row('AX-A0000001','Lagos','Abuja'),row('AX-A0000002','Kano','Kaduna'),row('AX-A0000003','Federal Capital Territory','Oyo')];let itemJob=rows[1].id,quoteRow=null;
const originalFetch=globalThis.fetch;delete process.env.DATABASE_URL;process.env.SUPABASE_URL='https://scope-test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_SCOPE_TEST';
globalThis.fetch=async(url,options)=>{const u=new URL(url);assert.equal(u.hostname,'scope-test.supabase.co');const body=options.body?JSON.parse(options.body):{};
 if(u.pathname.endsWith('/axic_shipments'))return Response.json(rows.filter(r=>!u.searchParams.get('id')||r.id===u.searchParams.get('id').slice(3)));
 if(u.pathname.endsWith('/axic_consignments'))return Response.json(rows.map(r=>({id:r.id,shipment_id:r.id,sender:{name:'Secret contact'},receiver:{},created:'2026-10-10'})));
 if(u.pathname.endsWith('/axic_goods'))return Response.json([{id:good,description:'QR item',weight:1,consignment_id:itemJob}]);
 if(u.pathname.endsWith('/axic_receipts'))return Response.json([]);
 if(u.pathname.endsWith('/axic_tickets'))return Response.json([]);
 if(u.pathname.endsWith('/axic_quote_requests')){if(options.method==='POST')quoteRow=body.payload;return Response.json(quoteRow?[{payload:quoteRow}]:[])}
 if(u.pathname.endsWith('/rpc/axic_quote_request_status')){quoteRow.status=body.p_status;return Response.json([{payload:quoteRow}])}throw Error('Unexpected call');
};
const req=(path,method='GET',body)=>new Request('https://test.local/api/'+path,{method,...(body?{headers:{origin:'https://test.local','Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
globalThis.axicScopeUser={id:actor,email:'staff.abuja@example.com',axicRole:'staff',axicState:'Abuja'};
let r=await shipment.GET(req('shipments'));assert.deepEqual((await r.json()).map(x=>x.id),[rows[0].id,rows[2].id]);r=await consignment.GET();assert.deepEqual((await r.json()).map(x=>x.id),[rows[0].id,rows[2].id]);
r=await goods.GET(req('goods?code='+good));assert.equal(r.status,404);assert.equal((await r.json()).description,undefined);itemJob=rows[0].id;assert.equal((await goods.GET(req('goods?code='+good))).status,200);
for(const api of [support,quotes])assert.equal((await api.GET()).status,403);
assert.equal((await shipment.PATCH(req('shipments','PATCH',{}))).status,403);assert.equal((await goods.POST(req('goods','POST',{}))).status,403);assert.equal((await goods.PATCH(req('goods','PATCH',{}))).status,403);assert.equal((await receipts.POST(req('receipts','POST',{}))).status,403);
globalThis.axicScopeUser.axicState='';assert.deepEqual(await (await shipment.GET(req('shipments'))).json(),[]);assert.deepEqual(await (await consignment.GET()).json(),[]);assert.equal((await goods.GET(req('goods?code='+good))).status,404);
globalThis.axicScopeUser=null;assert.equal((await consignment.GET()).status,401);
// Public tracking stays contact-free, even for another state's tracking ID.
r=await shipment.GET(req('shipments?id='+rows[1].id));assert.equal(r.status,200);assert.equal((await r.json()).sender,undefined);
const input={origin:'Lagos',destination:'Abuja',service:'Road freight',length:10,width:10,height:10,insurance:false,goods:[{description:'Carton',weight:5}],contact:{name:'Actual customer',phone:'+2348000000000',email:'customer@example.com'},amount:1,status:'Closed'};
r=await quotes.POST(req('quote-requests','POST',input));assert.equal(r.status,201);const publicQuote=await r.json();assert.equal(publicQuote.estimate,7500);assert.equal(publicQuote.status,'New');assert.equal(publicQuote.contact,undefined);assert.equal(quoteRow.contact.name,input.contact.name);assert.equal(rows.length,3);
r=await quotes.POST(req('quote-requests','POST',{...input,contact:{name:'',phone:'bad'}}));assert.equal(r.status,400);
globalThis.axicScopeUser={id:actor,email:'admin@example.com',axicRole:'admin',axicState:''};assert.equal((await (await shipment.GET(req('shipments'))).json()).length,3);assert.equal((await (await consignment.GET()).json()).length,3);assert.equal((await support.GET()).status,200);assert.equal((await quotes.GET()).status,200);
r=await quotes.PATCH(req('quote-requests','PATCH',{id:publicQuote.id,status:'Contacted'}));assert.equal(r.status,200);assert.equal((await r.json()).status,'Contacted');
// Prisma persists the same intake record; status updates are parameterized.
writeFileSync('work/quote-prisma.mjs','export function getPrisma(){return globalThis.axicQuotePrisma}');const {quoteRequests}=await import('../work/quote-requests-server.mjs');let stored;globalThis.axicQuotePrisma={quoteRequest:{create:async({data})=>{stored=data;return data},findMany:async()=>[stored]},$queryRaw:async(parts,...values)=>{assert(parts.join('?').includes('jsonb_set'));assert.deepEqual(values,['Closed',publicQuote.id]);return [{payload:{...quoteRow,status:'Closed'}}]}};process.env.DATABASE_URL='postgresql://TEST';await quoteRequests.create(quoteRow);assert.equal((await quoteRequests.list())[0].id,publicQuote.id);assert.equal((await quoteRequests.update(publicQuote.id,'Closed')).status,'Closed');
delete process.env.DATABASE_URL;delete globalThis.axicQuotePrisma;delete globalThis.axicScopeUser;globalThis.fetch=originalFetch;
console.log('PASS: actual handlers enforce staff state scope, deny unrelated/unassigned goods and admin functions, keep public tracking private, and save real quote intake separately from shipments via REST/Prisma.');
