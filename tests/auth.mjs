import ts from 'typescript';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
mkdirSync('work',{recursive:true});
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const jar=new Map();
globalThis.axicTestCookies={getAll:()=>[...jar].map(([name,c])=>({name,value:c.value})),set:(name,value,options)=>jar.set(name,{value,options}),delete:name=>jar.delete(name)};
writeFileSync('work/headers.mjs','export async function cookies(){return globalThis.axicTestCookies}');
writeFileSync('work/auth-server.mjs',compile(readFileSync('lib/auth-server.ts','utf8').replace("'next/headers'","'./headers.mjs'").replace("'./freight'","'./freight.mjs'").replace("'./auth-policy'","'../lib/auth-policy.ts'")));
for(const name of ['login','logout'])writeFileSync(`work/auth-${name}.mjs`,compile(readFileSync(`app/api/auth/${name}/route.ts`,'utf8').replace("'@/lib/workflow-server'","'./legacy-workflow.mjs'").replace("'@/lib/operator-scope'","'./operator-scope.mjs'").replace("'@/lib/auth-server'","'./auth-server.mjs'").replace("'@/lib/auth-policy'","'../lib/auth-policy.ts'").replace("'next/headers'","'./headers.mjs'")));
for(const name of ['shipments','support'])writeFileSync(`work/protected-${name}.mjs`,compile(readFileSync(`app/api/${name}/route.ts`,'utf8').replace("'@/lib/workflow-server'","'./legacy-workflow.mjs'").replace("'@/lib/operator-scope'","'./operator-scope.mjs'").replace("'@/lib/auth-server'","'./auth-server.mjs'").replace("'@/lib/storage-server'","'./storage-server.mjs'").replace("'@/lib/freight'","'./freight.mjs'").replace("'@/lib/consignment'","'../lib/consignment.ts'").replace("'@/lib/storage-server'","'./storage-server.mjs'").replace("'@/lib/consignment-server'","'./consignment-server.mjs'")));
writeFileSync('work/auth-admin.mjs',compile(readFileSync('lib/auth-admin-server.ts','utf8')));
for(const name of ['consignments','goods','team','receipts'])writeFileSync(`work/protected-${name}.mjs`,compile(readFileSync(`app/api/${name}/route.ts`,'utf8').replace("'@/lib/workflow-server'","'./legacy-workflow.mjs'").replace("'@/lib/operator-scope'","'./operator-scope.mjs'").replace("'@/lib/auth-server'","'./auth-server.mjs'").replace("'@/lib/freight'","'./freight.mjs'").replace("'@/lib/auth-admin-server'","'./auth-admin.mjs'").replace("'@/lib/auth-policy'","'../lib/auth-policy.ts'").replace("'@/lib/storage-server'","'./storage-server.mjs'").replace("'@/lib/consignment-server'","'./consignment-server.mjs'").replace("'@/lib/consignment'","'../lib/consignment.ts'").replace("'@/lib/supabase-server'","'../lib/supabase-server.ts'")));
const receipts=await import('../work/protected-receipts.mjs');
const team=await import('../work/protected-team.mjs'),goods=await import('../work/protected-goods.mjs'),consignments=await import('../work/protected-consignments.mjs');
const login=await import('../work/auth-login.mjs'),logout=await import('../work/auth-logout.mjs'),auth=await import('../work/auth-server.mjs');
const shipments=await import('../work/protected-shipments.mjs'),support=await import('../work/protected-support.mjs');
const {isAllowedOperator,operatorRole}=await import('../lib/auth-policy.ts');
assert(!isAllowedOperator({email:'staff@example.test',email_confirmed_at:'now'},''));
assert(!isAllowedOperator({email:'staff@example.test'},'staff@example.test'));
assert(isAllowedOperator({email:'STAFF@example.test',email_confirmed_at:'now'},' staff@example.test '));
assert.equal(operatorRole({email:'x@test.local',email_confirmed_at:'now',app_metadata:{axic_role:'admin'}},'', ''),'admin');
assert.equal(operatorRole({email:'x@test.local',email_confirmed_at:'now',app_metadata:{axic_role:'staff'}},'', ''),'staff');
assert.equal(operatorRole({email:'x@test.local',email_confirmed_at:'now',user_metadata:{axic_role:'admin'}},'', ''),null);
assert.equal(operatorRole({email:'staff@example.test',email_confirmed_at:'now',app_metadata:{axic_enabled:false}},'staff@example.test','staff@example.test'),null);
process.env.NODE_ENV='production';process.env.SUPABASE_URL='https://auth-test.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_TEST';process.env.OPERATIONS_ALLOWED_EMAILS='staff@example.test';
const request=(path,body,origin='https://test.local')=>new Request('https://test.local'+path,{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
const originalFetch=globalThis.fetch;let userEmail='staff@example.test',valid=true;const managed=new Map();const staffId='ca5e0002-0000-4000-8000-000000000001';
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:'test-staff',exp:Math.floor(Date.now()/1000)+3600})+'.mock_signature';
globalThis.fetch=async(url,options)=>{
 const u=new URL(url);assert.equal(u.hostname,'auth-test.supabase.co');
 if(u.pathname.includes('/admin/users')){assert.equal(new Headers(options.headers).get('apikey'),'sb_secret_ADMIN_TEST');
 const id=u.pathname.split('/').at(-1);if(options.method==='POST'){const b=JSON.parse(options.body);assert.equal(b.email_confirm,true);assert.equal(b.app_metadata.axic_role,'staff');assert.equal(b.password,'LONG_TEST_PASSWORD');const user={id:'ca5e0002-0000-4000-8000-000000000002',email:b.email,email_confirmed_at:'now',app_metadata:b.app_metadata,user_metadata:b.user_metadata,created_at:'now'};managed.set(user.id,user);return Response.json(user)}
 if(options.method==='PUT'){const b=JSON.parse(options.body);if(b.password)assert.equal(b.password,'NEW_LONG_PASSWORD');const user=managed.get(id);user.app_metadata=b.app_metadata;if(b.user_metadata)user.user_metadata=b.user_metadata;return Response.json(user)}
 if(id==='users')return Response.json({users:[...managed.values()]});return Response.json(id===staffId?{id:staffId,email:userEmail,email_confirmed_at:'now',app_metadata:{},user_metadata:{}}:managed.get(id));}

 if(u.pathname.endsWith('/token')){const body=JSON.parse(options.body);if(body.password!=='TEST_ONLY')return Response.json({msg:'Invalid login credentials',error_code:'invalid_credentials'},{status:400});return Response.json({access_token:token,refresh_token:'TEST_REFRESH',token_type:'bearer',expires_in:3600,user:{id:staffId,email:userEmail,email_confirmed_at:'2026-10-01',app_metadata:{},user_metadata:{}}})}
 if(u.pathname.endsWith('/user'))return valid?Response.json({id:staffId,email:userEmail,email_confirmed_at:'2026-10-01'}):Response.json({msg:'Invalid token'},{status:401});
 if(u.pathname.endsWith('/logout'))return new Response(null,{status:204});
 throw Error('Unexpected external request');
};
let r=await shipments.GET(new Request('https://test.local/api/shipments'));assert.equal(r.status,401);
r=await support.GET();assert.equal(r.status,401);
assert.equal((await receipts.POST(request('/api/receipts',{}))).status,401);assert.equal((await receipts.POST(request('/api/receipts',{},'https://evil.test'))).status,403);assert.equal((await team.GET()).status,401);assert.equal((await consignments.GET()).status,401);assert.equal((await goods.GET(new Request('https://test.local/api/goods?code=x'))).status,401);
assert.equal((await goods.POST(request('/api/goods',{}))).status,401);
r=await shipments.PATCH(new Request('https://test.local/api/shipments',{method:'PATCH',headers:{origin:'https://test.local'},body:'{}'}));assert.equal(r.status,401);
r=await support.PATCH(new Request('https://test.local/api/support',{method:'PATCH',headers:{origin:'https://evil.test'},body:'{}'}));assert.equal(r.status,403);
r=await login.POST(request('/api/auth/login',{email:userEmail,password:'TEST_ONLY'},'https://evil.test'));assert.equal(r.status,403);
r=await login.POST(request('/api/auth/login',{email:userEmail,password:'wrong'}));assert.equal(r.status,401);
r=await login.POST(request('/api/auth/login',{email:userEmail,password:'TEST_ONLY'}));assert.equal(r.status,200);assert(!JSON.stringify(await r.json()).includes(token));
assert(jar.size>0);for(const cookie of jar.values()){assert.equal(cookie.options.httpOnly,true);assert.equal(cookie.options.secure,true);assert.equal(cookie.options.sameSite,'lax')}
assert.equal((await auth.getOperator()).email,userEmail);
assert.equal((await auth.requireAdmin()).status,403);
assert.equal((await team.GET()).status,403);assert.equal((await team.POST(request('/api/team',{}))).status,403);
process.env.OPERATIONS_ADMIN_EMAILS=userEmail;process.env.SUPABASE_SECRET_KEY='sb_secret_ADMIN_TEST';assert.equal(await auth.requireAdmin(),null);
r=await team.POST(request('/api/team',{name:'QA Staff',email:'new@example.test',password:'LONG_TEST_PASSWORD',role:'staff',state:'Lagos'}));assert.equal(r.status,201);const member=await r.json();assert.equal(member.state,'Lagos');assert.equal(member.role,'staff');assert.equal(member.password,undefined);assert.equal(member.app_metadata,undefined);
r=await team.GET();assert.equal((await r.json()).length,1);
r=await team.PATCH(new Request('https://test.local/api/team',{method:'PATCH',headers:{origin:'https://test.local'},body:JSON.stringify({id:member.id,name:'Changed Name',password:'NEW_LONG_PASSWORD',state:'Abuja'})}));assert.equal(r.status,200);const edited=await r.json();assert.equal(edited.name,'Changed Name');assert.equal(edited.state,'Abuja');assert.equal(edited.password,undefined);assert.equal(edited.role,'staff');
r=await team.PATCH(new Request('https://test.local/api/team',{method:'PATCH',headers:{origin:'https://test.local'},body:JSON.stringify({id:member.id,password:'short'})}));assert.equal(r.status,400);
r=await team.PATCH(new Request('https://test.local/api/team',{method:'PATCH',headers:{origin:'https://test.local'},body:JSON.stringify({id:member.id,role:'admin',active:false})}));assert.equal(r.status,200);assert.equal((await r.json()).active,false);
r=await team.PATCH(new Request('https://test.local/api/team',{method:'PATCH',headers:{origin:'https://test.local'},body:JSON.stringify({id:staffId,role:'staff',active:false})}));assert.equal(r.status,409);
assert.equal((await auth.requireAdmin(request('/api/team',{},'https://evil.test'))).status,403);
delete process.env.OPERATIONS_ADMIN_EMAILS;
valid=false;assert.equal(await auth.getOperator(),null);valid=true;
r=await logout.POST(request('/api/auth/logout',{}));assert.equal(r.status,200);assert.equal(await auth.getOperator(),null);
userEmail='outsider@example.test';r=await login.POST(request('/api/auth/login',{email:userEmail,password:'TEST_ONLY'}));assert.equal(r.status,403);assert.equal(await auth.getOperator(),null);
globalThis.fetch=originalFetch;delete globalThis.axicTestCookies;
console.log('PASS: actual Supabase SSR SDK and auth handlers with mocked Auth service: staff/admin roles, admin-only account creation/suspension, self-access guard, protected goods and consignments, staff login, HttpOnly cookies, provider verification, allowlist rejection, logout, unauthenticated API denial, and cross-origin write rejection.');
