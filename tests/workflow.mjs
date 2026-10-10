import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
writeFileSync('work/state-auth.mjs',`export async function getOperator(){return globalThis.axicWorkflowUser};export async function requireOperator(req){if(req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Origin'},{status:403});if(!globalThis.axicWorkflowUser)return Response.json({error:'Sign in'},{status:401});return null}`);
writeFileSync('work/state-workflow.mjs',compile(readFileSync('lib/workflow-server.ts','utf8').replace("'./supabase-server'","'../lib/supabase-server.ts'").replace("'./prisma-server'","'./state-prisma.mjs'")));
writeFileSync('work/state-api.mjs',compile(readFileSync('app/api/workflow/route.ts','utf8').replace("'@/lib/auth-server'","'./state-auth.mjs'").replace("'@/lib/workflow-server'","'./state-workflow.mjs'").replace("'@/lib/workflow'","'../lib/workflow.ts'").replace("'@/lib/consignment'","'../lib/consignment.ts'").replace("'@/lib/supabase-server'","'../lib/supabase-server.ts'")));
const api=await import('../work/state-api.mjs'),{workflow}=await import('../work/state-workflow.mjs');
const req=(body,origin='https://test.local')=>new Request('https://test.local/api/workflow',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
globalThis.axicWorkflowUser=null;assert.equal((await api.GET()).status,401);assert.equal((await api.POST(req({}))).status,401);
const actor='ca5e0004-0000-4000-8000-000000000001',good='ca5e0004-0000-4000-8000-000000000002',alert='ca5e0004-0000-4000-8000-000000000003',id='AX-C0DE0001';
globalThis.axicWorkflowUser={id:actor,email:'staff.lagos@example.com',axicRole:'staff',axicState:'Lagos'};
assert.equal((await api.POST(req({},'https://evil.local'))).status,403);assert.equal((await api.POST(req({id,action:'forged'}))).status,400);
process.env.SUPABASE_URL='https://state-test.supabase.co';process.env.SUPABASE_SECRET_KEY='sb_secret_STATE_TEST';delete process.env.DATABASE_URL;
const originalFetch=globalThis.fetch;const job={consignment_id:id,origin:'Lagos',destination:'Abuja',stage:'Pickup claimed'};let status=200,calls=0;
globalThis.fetch=async(url,options)=>{const u=new URL(url);assert.equal(options.headers.apikey,'sb_secret_STATE_TEST');assert.equal(options.cache,'no-store');calls++;
 if(u.pathname.endsWith('/rpc/axic_workflow_action')){const b=JSON.parse(options.body);assert.equal(b.p_id,id);assert.equal(b.p_actor,actor);assert.equal(b.p_name,'staff.lagos@example.com');assert.equal(b.p_state,'Lagos');if(b.p_action==='scan_pickup')assert.equal(b.p_good,good);return Response.json(status===200?job:{details:'private secret'},{status});}
 if(u.pathname.endsWith('/axic_workflows')){assert.equal(u.searchParams.get('or'),'(origin.eq.Lagos,destination.eq.Lagos)');return Response.json([job])}
 if(u.pathname.endsWith('/axic_workflow_scans'))return Response.json([]);
 if(u.pathname.endsWith('/axic_workflow_alerts')){assert.equal(u.searchParams.get('state'),'eq.Lagos');return Response.json([{id:alert,state:'Lagos',consignment_id:id}])}
 if(u.pathname.endsWith('/axic_workflow_reads'))return Response.json([{alert_id:alert}]);throw Error('Unexpected request');
};
for(const code of [good,'AXIC:GOOD:'+good,'https://axic-logistics.vercel.app/operations/scan?code='+good]){const r=await api.POST(req({id,action:'scan_pickup',code,actor:'forged',state:'Abuja'}));assert.equal(r.status,200);assert.deepEqual(await r.json(),job)}
let r=await api.GET();assert.equal(r.status,200);const data=await r.json();assert.equal(data.jobs.length,1);assert.equal(data.alerts[0].read,true);
for(const errorStatus of [403,404,409,500]){status=errorStatus;r=await api.POST(req({id,action:'claim_pickup'}));assert.equal(r.status,errorStatus===500?503:errorStatus);assert(!JSON.stringify(await r.json()).includes('secret'))}
globalThis.axicWorkflowUser.axicState='';const before=calls;assert.equal((await api.POST(req({id,action:'claim_pickup'}))).status,403);assert.equal(calls,before);
// Both storage paths bind the exact same action and trusted actor to the SQL function.
writeFileSync('work/state-prisma.mjs','export function getPrisma(){return globalThis.axicStatePrisma}');globalThis.axicStatePrisma={$queryRaw:async(parts,...values)=>{assert(parts.join('?').includes('public.axic_workflow_action'));assert.deepEqual(values.slice(0,6),[id,'scan_pickup',actor,'QA','Lagos',good]);return [{result:job}]}};process.env.DATABASE_URL='postgresql://TEST_ONLY';assert.deepEqual(await workflow.action(id,'scan_pickup',actor,'QA','Lagos',good),job);
delete process.env.DATABASE_URL;delete globalThis.axicStatePrisma;delete globalThis.axicWorkflowUser;globalThis.fetch=originalFetch;
console.log('PASS: state workflow authentication, CSRF, state-scoped queue/read state, manual/QR equivalence, trusted operator/state, sanitized conflicts and Prisma/REST adapters. Full lifecycle and competing-claim rules are separately verified by rolled-back live SQL.');
